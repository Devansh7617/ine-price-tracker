# Engineering Design Note

## Making the Scraper Reliable
To ensure the scraper doesn't just work once, but runs reliably in the background, I implemented a few specific strategies:
1. **Human Emulation:** The target site uses a proof-of-work honeypot to disable the "Reveal Price" button. The scraper bypasses this by injecting JavaScript that simulates 12 random, human-like mouse movements with realistic 600ms pauses before attempting to click.
2. **Retry Manager & Exponential Backoff:** Scrapers naturally fail due to network blips or strict bot checks. I wrapped the scraper in a retry loop (max 3 attempts). If attempt 1 fails, it waits 2 seconds. If attempt 2 fails, it waits 4 seconds. This prevents spamming the server and drastically increases the success rate.
3. **Strict Timeouts:** The scraper waits a maximum of 15 seconds for the DOM to decrypt and render the price, and has a hard cap of 30 seconds for the entire operation. This ensures the background job never hangs the server indefinitely.

## Trade-offs Made
**Speed vs. Accuracy (The Hybrid Approach)**
Instead of using Playwright to scrape all 1,000 products on the site (which would be incredibly slow and resource-heavy), I made a trade-off. 
I used a lightweight HTTP `fetch` to hit the site's hidden `/api/catalog` to quickly sync the names and IDs into my database for fast searching. I *only* spin up the heavy Playwright browser for the specific products the user actively tracks. It uses more code to maintain two different fetching methods, but it saves a massive amount of server memory.

## Working with AI Tools: What went wrong and how I fixed it
I used an AI coding assistant to help scaffold the boilerplate, but it made a few critical mistakes that required manual architectural corrections:

1. **The Infinite Pagination Bug:** 
   The AI wrote a standard loop to paginate through the catalog (Page 1, 2, 3). However, it failed to realize that the target store dynamically shuffles its products on *every single request*. The AI's code resulted in hundreds of duplicate items and only captured about 60% of the catalog. I had to rewrite the logic to use a JavaScript `Set` to track unique IDs, continuously looping and filtering duplicates until it successfully captured all 1,000 unique items.
2. **Dependency & Environment Conflicts:** 
   When writing the `Dockerfile` for deployment, the AI defaulted to `mcr.microsoft.com/playwright:v1.48.0-jammy`. Unfortunately, this older container used Node 20, which broke the newest version of `@supabase/supabase-js` (which now requires Node 22+ for native WebSockets). Furthermore, Render automatically installed Playwright `1.63.0` via npm, which mismatched the container binaries and crashed the app. I had to manually intervene, pin the `package.json` tightly to `1.63.0`, and upgrade the Docker container to match, ensuring environment stability.
