import { logger } from '../logger.js';

/**
 * Extracts the product price from a Makro PRO URL or Product ID using their API or SSR HTML.
 * @param {string} url - The Makro product URL (e.g. https://www.makro.pro/p/...)
 * @returns {Promise<{price: number, unit: string} | null>}
 */
export async function scrapeMakroPrice(url) {
    try {
        // Extract product ID from URL. Typically: /p/product-id
        const match = url.match(/\/p\/([a-zA-Z0-9-]+)/);
        if (!match) {
            logger.warn('MarketScraper', 'Invalid Makro URL', { url });
            return null;
        }
        const productId = match[1];

        // Fetching pricing data natively from Next.js server (Bypassing headless browsers)
        // Since Makro Pro is SSR, parsing the raw HTML or internal NextJS data props works best.
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
            },
            next: { revalidate: 3600 } // cache for 1 hour locally
        });

        if (!res.ok) {
            logger.error('MarketScraper', `Failed to fetch Makro URL: ${res.status}`, { url });
            return null;
        }

        const html = await res.text();

        // 1. Look for application/ld+json schemas (Offers/Product)
        const ldJsonRegex = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;
        let prices = [];
        let r;
        while ((r = ldJsonRegex.exec(html)) !== null) {
            try {
                const data = JSON.parse(r[1]);
                const objects = Array.isArray(data) ? data : [data];
                for (const obj of objects) {
                    if (obj['@type'] === 'Product' && obj.offers?.price) {
                        prices.push(parseFloat(obj.offers.price));
                    }
                }
            } catch (e) { }
        }

        // 2. Alternatively, parse Next.js __NEXT_DATA__ if LD JSON isn't present
        if (prices.length === 0) {
            const nextDataMatch = html.match(/id="__NEXT_DATA__" type="application\/json">([^<]+)<\/script>/);
            if (nextDataMatch) {
                try {
                    const nextData = JSON.parse(nextDataMatch[1]);
                    // Traverse NextData for price — structure varies, fallback generic regex
                    const jsonStr = JSON.stringify(nextData);
                    const priceMatches = jsonStr.match(/"sellingPrice":(\d+(?:\.\d+)?)/) || jsonStr.match(/"price":(\d+(?:\.\d+)?)/);
                    if (priceMatches) {
                        prices.push(parseFloat(priceMatches[1]));
                    }
                } catch (e) { }
            }
        }

        if (prices.length > 0) {
             return { price: prices[0], unit: 'unit' }; 
        }

        return null;
    } catch (err) {
        logger.error('MarketScraper', 'Makro scrape error', err);
        return null;
    }
}

/**
 * Extracts the product price from a Lotus's URL using their API or SSR HTML.
 * @param {string} url - The Lotus's product URL
 * @returns {Promise<{price: number, unit: string} | null>}
 */
export async function scrapeLotusPrice(url) {
    try {
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
            },
            next: { revalidate: 3600 }
        });

        if (!res.ok) {
            logger.error('MarketScraper', `Failed to fetch Lotus URL: ${res.status}`, { url });
            return null;
        }

        const html = await res.text();

        // 1. Look for application/ld+json 
        const ldJsonRegex = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;
        let prices = [];
        let r;
        while ((r = ldJsonRegex.exec(html)) !== null) {
            try {
                const data = JSON.parse(r[1]);
                let objects = Array.isArray(data) ? data : [data];
                
                // Sometimes ld+json is nested in '@graph'
                if (data['@graph']) {
                    objects = data['@graph'];
                }

                for (const obj of objects) {
                    if (obj['@type'] === 'Product' && obj.offers) {
                        const offers = Array.isArray(obj.offers) ? obj.offers : [obj.offers];
                        for (const offer of offers) {
                            if (offer.price) {
                                prices.push(parseFloat(offer.price));
                            }
                        }
                    }
                }
            } catch (e) { }
        }

        if (prices.length > 0) {
            return { price: prices[0], unit: 'unit' };
        }

        return null;
    } catch (err) {
        logger.error('MarketScraper', 'Lotus scrape error', err);
        return null;
    }
}
