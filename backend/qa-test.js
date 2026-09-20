const http = require('http');

function get(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

async function test() {
  try {
    console.log('1. Testing search API (will trigger cache refresh)...');
    const searchRes = await get('http://localhost:3001/api/products/search?q=headphones');
    console.log(`Search returned ${searchRes.count} items.`);

    console.log('\n2. Tracking a product...');
    const trackReq = http.request('http://localhost:3001/api/tracked-products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const trackRes = JSON.parse(data);
        console.log('Track product response:', trackRes.success);
        
        if(trackRes.data && trackRes.data.id) {
          console.log('\n3. Triggering scrape (this will take 10-20 seconds to run Playwright)...');
          const scrapeReq = http.request(`http://localhost:3001/api/tracked-products/${trackRes.data.id}/scrape`, {
            method: 'POST'
          }, (res2) => {
            let data2 = '';
            res2.on('data', chunk => data2 += chunk);
            res2.on('end', () => {
                console.log('\nScrape response:', JSON.stringify(JSON.parse(data2), null, 2));
            });
          });
          scrapeReq.end();
        }
      });
    });
    
    trackReq.write(JSON.stringify({
      store_product_id: 1,
      product_name: 'Nordkraft Headphones Pro',
      sku: 'NOR-10001',
      brand: 'Nordkraft',
      category: 'Audio'
    }));
    trackReq.end();

  } catch(e) {
    console.error('Test failed:', e);
  }
}
test();
