"""
bottom_up_aggregation.py
─────────────────────────────────────────────────────────────────────────────
V School CRM v2 — ADR-024: Marketing Intelligence Bottom-Up Aggregation

Strategy:
  L1 (Ad)       → raw metrics from ad_daily_metrics / ad_hourly_metrics
  L2 (AdSet)    → pandas groupby: sum all Ads per AdSet
  L3 (Campaign) → pandas groupby: sum all AdSets per Campaign

Derived metrics (computed on-the-fly, never stored):
  ROAS = revenue / spend
  CTR  = clicks / impressions
  CPA  = spend / clicks

Usage:
  pip install -r scripts/requirements.txt
  python scripts/bottom_up_aggregation.py --mode daily --from 2026-03-01 --checksum
  python scripts/bottom_up_aggregation.py --mode daily --filter "ญี่ปุ่น" --export out.csv
  python scripts/bottom_up_aggregation.py --mode hourly --write-ledger
"""

import argparse
import os
import sys
from datetime import datetime, timedelta

import numpy as np
import pandas as pd
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

# ── Load env ────────────────────────────────────────────────────────────────
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

DATABASE_URL = os.environ.get('DATABASE_URL')
if not DATABASE_URL:
    print('[ERROR] DATABASE_URL not found in environment', file=sys.stderr)
    sys.exit(1)


def get_engine():
    """Create SQLAlchemy engine from DATABASE_URL (PostgreSQL)."""
    # Prisma uses postgresql:// prefix; SQLAlchemy needs postgresql+psycopg2://
    url = DATABASE_URL.replace('postgresql://', 'postgresql+psycopg2://', 1)
    return create_engine(url, echo=False)


# ── Data Loading ─────────────────────────────────────────────────────────────

def load_metrics(engine, mode: str, date_from: str, date_to: str) -> pd.DataFrame:
    """
    Load ad metrics joined with ad → adset → campaign hierarchy.
    mode: 'daily'  → reads from ad_daily_metrics
          'hourly' → reads from ad_hourly_metrics
    """
    table = 'ad_daily_metrics' if mode == 'daily' else 'ad_hourly_metrics'
    hour_col = ', m.hour' if mode == 'hourly' else ''

    query = f"""
        SELECT
            m.ad_id,
            a.name              AS ad_name,
            a.status            AS ad_status,
            s.ad_set_id,
            s.name              AS ad_set_name,
            c.campaign_id,
            c.name              AS campaign_name,
            c.fb_spend          AS campaign_fb_spend,
            m.date{hour_col},
            m.spend,
            m.impressions,
            m.clicks,
            m.leads,
            m.purchases,
            m.revenue
        FROM {table} m
        JOIN ads         a ON a.ad_id       = m.ad_id
        JOIN ad_sets     s ON s.ad_set_id   = a.ad_set_id
        JOIN campaigns   c ON c.campaign_id = s.campaign_id
        WHERE m.date BETWEEN :from_date AND :to_date
        ORDER BY m.date, c.campaign_id, s.ad_set_id, m.ad_id
    """

    df = pd.read_sql(
        text(query),
        engine,
        params={'from_date': date_from, 'to_date': date_to},
    )
    return df


# ── Derived Metrics ──────────────────────────────────────────────────────────

def add_derived_metrics(df: pd.DataFrame) -> pd.DataFrame:
    """Add ROAS, CTR, CPA columns (vectorized with numpy)."""
    spend = df['spend'].to_numpy(dtype=float)
    revenue = df['revenue'].to_numpy(dtype=float)
    clicks = df['clicks'].to_numpy(dtype=float)
    impressions = df['impressions'].to_numpy(dtype=float)

    df['roas'] = np.where(spend > 0, revenue / spend, 0.0)
    df['ctr']  = np.where(impressions > 0, clicks / impressions * 100, 0.0)  # %
    df['cpa']  = np.where(clicks > 0, spend / clicks, 0.0)
    return df


# ── Bottom-Up Aggregation ────────────────────────────────────────────────────

METRIC_COLS = ['spend', 'impressions', 'clicks', 'leads', 'purchases', 'revenue']


def aggregate_l1(df: pd.DataFrame) -> pd.DataFrame:
    """L1: Per-Ad metrics, summed across date range."""
    group_cols = ['campaign_id', 'campaign_name', 'ad_set_id', 'ad_set_name', 'ad_id', 'ad_name', 'ad_status']
    l1 = df.groupby(group_cols, as_index=False)[METRIC_COLS].sum()
    return add_derived_metrics(l1)


def aggregate_l2(df: pd.DataFrame) -> pd.DataFrame:
    """L2: Per-AdSet metrics = sum of all Ads in that AdSet."""
    group_cols = ['campaign_id', 'campaign_name', 'ad_set_id', 'ad_set_name']
    l2 = df.groupby(group_cols, as_index=False)[METRIC_COLS].sum()
    return add_derived_metrics(l2)


def aggregate_l3(df: pd.DataFrame) -> pd.DataFrame:
    """L3: Per-Campaign metrics = sum of all AdSets in that Campaign."""
    group_cols = ['campaign_id', 'campaign_name']
    l3 = df.groupby(group_cols, as_index=False)[METRIC_COLS + ['campaign_fb_spend']].agg(
        {**{col: 'sum' for col in METRIC_COLS}, 'campaign_fb_spend': 'first'}
    )
    return add_derived_metrics(l3)


def aggregate_daily(df: pd.DataFrame) -> pd.DataFrame:
    """Cross-campaign daily totals (date-level aggregation)."""
    daily = df.groupby('date', as_index=False)[METRIC_COLS].sum()
    return add_derived_metrics(daily)


# ── Checksum Verification ─────────────────────────────────────────────────────

def run_checksum(l3: pd.DataFrame, tolerance: float = 0.01) -> bool:
    """
    ADR-024 D3: Verify Sum(Ad.spend) ≈ Campaign.fb_spend (Meta API snapshot).
    Tolerance: ±1% (rounding differences from Meta).
    Non-blocking — logs mismatches but does not raise.
    """
    has_snapshot = l3['campaign_fb_spend'].notna() & (l3['campaign_fb_spend'] > 0)
    verifiable = l3[has_snapshot].copy()

    if verifiable.empty:
        print('[CHECKSUM] No campaigns have fb_spend snapshot — skipping')
        return True

    verifiable['delta'] = verifiable['spend'] - verifiable['campaign_fb_spend']
    verifiable['delta_pct'] = (
        verifiable['delta'].abs() / verifiable['campaign_fb_spend'].replace(0, np.nan)
    )

    fails = verifiable[verifiable['delta_pct'] > tolerance]
    passes = verifiable[verifiable['delta_pct'] <= tolerance]

    print(f'\n{"─"*60}')
    print(f'CHECKSUM  (tolerance={tolerance*100:.1f}%)')
    print(f'{"─"*60}')
    print(f'  ✓ Pass : {len(passes)} campaigns')
    print(f'  ✗ Fail : {len(fails)} campaigns')

    if not fails.empty:
        for _, row in fails.iterrows():
            print(
                f'  [MISMATCH] {row["campaign_name"][:40]:<40} '
                f'calculated=฿{row["spend"]:>10,.2f}  '
                f'meta=฿{row["campaign_fb_spend"]:>10,.2f}  '
                f'Δ={row["delta_pct"]*100:.2f}%'
            )
        return False

    print('  All campaigns within tolerance ✓')
    return True


# ── Hourly Ledger Writer ──────────────────────────────────────────────────────

def write_ledger_if_changed(df: pd.DataFrame, engine) -> int:
    """
    ADR-024 D4: Append-only ledger. Delta Rule: only write rows where
    metrics changed since last ledger entry for (adId, date, hour).
    Returns number of rows written.
    """
    if 'hour' not in df.columns:
        print('[LEDGER] --write-ledger requires --mode hourly', file=sys.stderr)
        return 0

    # Load last ledger entry per (ad_id, date, hour)
    last_query = text("""
        SELECT DISTINCT ON (ad_id, date, hour)
            ad_id, date, hour, spend, impressions, clicks
        FROM ad_hourly_ledger
        ORDER BY ad_id, date, hour, created_at DESC
    """)
    last_df = pd.read_sql(last_query, engine)

    merge_keys = ['ad_id', 'date', 'hour']
    merged = df.merge(last_df, on=merge_keys, how='left', suffixes=('', '_prev'))

    # Delta: any metric changed (or no previous record)
    changed_mask = (
        merged['spend_prev'].isna() |
        (merged['spend'] != merged['spend_prev']) |
        (merged['impressions'] != merged['impressions_prev']) |
        (merged['clicks'] != merged['clicks_prev'])
    )

    delta = merged[changed_mask][['ad_id', 'date', 'hour'] + METRIC_COLS].copy()

    if delta.empty:
        print('[LEDGER] No changes detected — 0 rows written')
        return 0

    delta.to_sql('ad_hourly_ledger', engine, if_exists='append', index=False, method='multi')
    print(f'[LEDGER] Wrote {len(delta)} delta rows to ad_hourly_ledger')
    return len(delta)


# ── Print Report ─────────────────────────────────────────────────────────────

def print_report(l1: pd.DataFrame, l2: pd.DataFrame, l3: pd.DataFrame, daily: pd.DataFrame):
    """Print human-readable bottom-up summary to stdout."""

    def fmt_thb(v): return f'฿{v:>12,.2f}'
    def fmt_num(v): return f'{int(v):>12,}'
    def fmt_pct(v): return f'{v:>10.2f}%'

    print(f'\n{"═"*70}')
    print('  V SCHOOL CRM — BOTTOM-UP AGGREGATION REPORT')
    print(f'{"═"*70}')

    # L3 Summary
    print('\n[L3] Campaign-Level Totals')
    print(f'  {"Campaign":<40} {"Spend":>12} {"Revenue":>12} {"ROAS":>8} {"Clicks":>9}')
    print(f'  {"─"*40} {"─"*12} {"─"*12} {"─"*8} {"─"*9}')
    for _, r in l3.iterrows():
        print(
            f'  {r["campaign_name"][:40]:<40} '
            f'{fmt_thb(r["spend"])} '
            f'{fmt_thb(r["revenue"])} '
            f'{r["roas"]:>8.2f}x '
            f'{fmt_num(r["clicks"])}'
        )

    # L2 Summary
    print(f'\n[L2] AdSet-Level Totals ({len(l2)} ad sets)')
    print(f'  {"AdSet":<40} {"Spend":>12} {"CTR":>10} {"CPA":>12}')
    print(f'  {"─"*40} {"─"*12} {"─"*10} {"─"*12}')
    for _, r in l2.head(10).iterrows():
        print(
            f'  {r["ad_set_name"][:40]:<40} '
            f'{fmt_thb(r["spend"])} '
            f'{fmt_pct(r["ctr"])} '
            f'{fmt_thb(r["cpa"])}'
        )
    if len(l2) > 10:
        print(f'  ... and {len(l2) - 10} more ad sets')

    # Grand Total
    total_spend = l3['spend'].sum()
    total_revenue = l3['revenue'].sum()
    total_roas = total_revenue / total_spend if total_spend > 0 else 0
    print(f'\n[TOTAL] Grand Total across all campaigns')
    print(f'  Spend    : {fmt_thb(total_spend)}')
    print(f'  Revenue  : {fmt_thb(total_revenue)}')
    print(f'  ROAS     : {total_roas:.2f}x')
    print(f'  Clicks   : {fmt_num(l1["clicks"].sum())}')
    print(f'  Leads    : {fmt_num(l1["leads"].sum())}')
    print(f'  Purchases: {fmt_num(l1["purchases"].sum())}')
    print(f'{"═"*70}\n')


# ── CLI ───────────────────────────────────────────────────────────────────────

def parse_args():
    parser = argparse.ArgumentParser(
        description='V School CRM — Bottom-Up Marketing Aggregation (ADR-024)'
    )
    parser.add_argument('--mode', choices=['daily', 'hourly'], default='daily',
                        help='Data source: daily metrics or hourly metrics')
    parser.add_argument('--filter', dest='filter_kw', default='',
                        help='Keyword filter on campaign/ad name (e.g. "ญี่ปุ่น" or "Sushi")')
    parser.add_argument('--from', dest='date_from', default=None,
                        help='Start date YYYY-MM-DD (default: 30 days ago)')
    parser.add_argument('--to', dest='date_to', default=None,
                        help='End date YYYY-MM-DD (default: today)')
    parser.add_argument('--checksum', action='store_true',
                        help='Run checksum verification against Meta API fb_spend snapshot')
    parser.add_argument('--write-ledger', action='store_true',
                        help='Write delta rows to ad_hourly_ledger (requires --mode hourly)')
    parser.add_argument('--export', dest='export_path', default=None,
                        help='Export L3 campaign results to CSV (e.g. out.csv)')
    return parser.parse_args()


def main():
    args = parse_args()

    today = datetime.today().strftime('%Y-%m-%d')
    date_from = args.date_from or (datetime.today() - timedelta(days=30)).strftime('%Y-%m-%d')
    date_to   = args.date_to   or today

    print(f'[INFO] Mode     : {args.mode}')
    print(f'[INFO] Date     : {date_from} → {date_to}')
    print(f'[INFO] Filter   : "{args.filter_kw}"' if args.filter_kw else '[INFO] Filter   : (none)')
    print(f'[INFO] Checksum : {args.checksum}')
    print(f'[INFO] Ledger   : {args.write_ledger}')

    engine = get_engine()

    # 1. Load raw metrics
    print('\n[LOAD] Fetching data from PostgreSQL...')
    df = load_metrics(engine, args.mode, date_from, date_to)
    print(f'[LOAD] {len(df):,} rows loaded')

    if df.empty:
        print('[WARN] No data found for the given date range. Run marketing sync first.')
        return

    # 2. Apply keyword filter
    if args.filter_kw:
        kw = args.filter_kw.lower()
        mask = (
            df['campaign_name'].str.lower().str.contains(kw, na=False) |
            df['ad_name'].str.lower().str.contains(kw, na=False) |
            df['ad_set_name'].str.lower().str.contains(kw, na=False)
        )
        df = df[mask].copy()
        print(f'[FILTER] "{args.filter_kw}" → {len(df):,} rows remaining')

        if df.empty:
            print(f'[WARN] No data matches filter "{args.filter_kw}"')
            return

    # 3. Bottom-Up Aggregation
    print('\n[CALC] Running bottom-up aggregation...')
    l1    = aggregate_l1(df)
    l2    = aggregate_l2(df)
    l3    = aggregate_l3(df)
    daily = aggregate_daily(df)

    print(f'  L1 (Ads)      : {len(l1):,} records')
    print(f'  L2 (AdSets)   : {len(l2):,} records')
    print(f'  L3 (Campaigns): {len(l3):,} records')
    print(f'  Daily totals  : {len(daily):,} days')

    # 4. Print report
    print_report(l1, l2, l3, daily)

    # 5. Checksum verification
    if args.checksum:
        run_checksum(l3)

    # 6. Write hourly ledger (delta-only)
    if args.write_ledger:
        write_ledger_if_changed(df, engine)

    # 7. Export to CSV
    if args.export_path:
        l3.to_csv(args.export_path, index=False, encoding='utf-8-sig')
        print(f'[EXPORT] L3 results saved to: {args.export_path}')

    engine.dispose()
    print('[DONE]')


if __name__ == '__main__':
    main()
