import { chromium } from 'playwright';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CLUB_DAM_ID = process.env.CLUB_DAM_ID;
const CLUB_DAM_PASS = process.env.CLUB_DAM_PASS;

if (!CLUB_DAM_ID || !CLUB_DAM_PASS) {
  console.error('Error: CLUB_DAM_ID and CLUB_DAM_PASS environment variables are required');
  process.exit(1);
}

interface KaraokeScore {
  songName: string;
  artist: string;
  score: number;
  date?: string;
  scoringType: string;
}

async function scrapeKaraokeScores(): Promise<KaraokeScore[]> {
  const browser = await chromium.launch({
    headless: true,
  });

  try {
    const context = await browser.newContext();
    const page = await context.newPage();

    console.log('Navigating to DAM TOMO login page...');
    await page.goto('https://www.clubdam.com/app/damtomo/auth/member/Login.do', {
      waitUntil: 'networkidle',
      timeout: 60000
    });

    console.log('Filling in login credentials...');
    await page.fill('input[name="id"]', CLUB_DAM_ID);
    await page.fill('input[name="password"]', CLUB_DAM_PASS);

    console.log('Submitting login form...');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle', timeout: 60000 }),
      page.click('input[type="submit"][value="ログイン"]')
    ]);

    console.log('Login successful!');
    const allScores: KaraokeScore[] = [];

    // List of scoring types to check
    const scoringTypes = [
      { id: 'DamHistoryMarkingAi', name: '精密採点Ai' },
      { id: 'DamHistoryMarkingHearts', name: '精密採点Ai Heart' },
      { id: 'DamHistoryMarkingCollabo', name: '精密採点 × ONE PIECE' },
    ];

    for (const scoringType of scoringTypes) {
      console.log(`\n=== Checking ${scoringType.name} ===`);

      try {
        // Click the link to show this scoring type
        const linkSelector = `#${scoringType.id}ListLink a`;
        const linkExists = await page.locator(linkSelector).count();

        if (linkExists === 0) {
          console.log(`Link not found for ${scoringType.name}`);
          continue;
        }

        await page.click(linkSelector);
        await page.waitForTimeout(2000);

        // Wait for the result container
        const resultSelector = `#${scoringType.id}ListResult`;
        await page.waitForSelector(resultSelector, { timeout: 5000 });

        // Check if there's a "no data" message
        const noDataMessage = await page.locator(`${resultSelector} .no_result`).count();

        if (noDataMessage > 0) {
          console.log(`No data found for ${scoringType.name}`);
          continue;
        }

        // Get the number of pages
        const pageLinks = await page.locator(`${resultSelector} .ppage li a`).all();
        const totalPages = pageLinks.length;
        console.log(`Found ${totalPages} pages of data`);

        // Extract data from all pages
        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
          console.log(`Extracting page ${pageNum}/${totalPages}...`);

          // Click the page link if not on page 1
          if (pageNum > 1) {
            const pageLinkSelector = `${resultSelector} .ppage li a:has-text("${pageNum}")`;
            await page.click(pageLinkSelector);
            await page.waitForTimeout(1500);
          }

          // Extract scores from the current page
          const scores = await page.evaluate(({ selector, typeName }) => {
            const results: { songName: string; artist: string; score: number; date?: string; scoringType: string }[] = [];
            const container = document.querySelector(selector);

            if (!container) return results;

            // Find all tables with class "ai"
            const tables = container.querySelectorAll('table.ai');

            tables.forEach(table => {
              try {
                const row = table.querySelector('tr');
                if (!row) return;

                const cells = row.querySelectorAll('td');
                if (cells.length < 3) return;

                // Extract date (first td with class field_01)
                const date = cells[0]?.textContent?.trim() || '';

                // Extract song name and artist (second td)
                const songCell = cells[1];
                const songLink = songCell?.querySelector('a');
                const songName = songLink?.textContent?.trim() || '';

                // Artist is after the <br> tag
                const brElement = songCell?.querySelector('br');
                let artist = '';
                if (brElement && brElement.nextSibling) {
                  artist = brElement.nextSibling.textContent?.trim() || '';
                }

                // Extract score (third td)
                const scoreText = cells[2]?.textContent?.trim() || '';
                const scoreMatch = scoreText.match(/[\d.]+/);
                const score = scoreMatch ? parseFloat(scoreMatch[0]) : 0;

                if (songName && score > 0) {
                  results.push({
                    songName,
                    artist: artist || 'Unknown',
                    score,
                    date,
                    scoringType: typeName
                  });
                }
              } catch (e) {
                console.error('Error parsing table:', e);
              }
            });

            return results;
          }, { selector: resultSelector, typeName: scoringType.name });

          console.log(`Found ${scores.length} scores on page ${pageNum}`);
          allScores.push(...scores);
        }

        console.log(`Total scores for ${scoringType.name}: ${allScores.length}`);

      } catch (error) {
        console.log(`Error processing ${scoringType.name}:`, error);
      }
    }

    console.log(`\n=== Total scores found: ${allScores.length} ===`);

    if (allScores.length === 0) {
      console.log('\nNo scores found.');
      return [];
    }

    // Load existing scores for differential update
    const outputPath = path.join(__dirname, 'scores.json');
    let existingScores: KaraokeScore[] = [];

    try {
      const existingData = await fs.readFile(outputPath, 'utf-8');
      existingScores = JSON.parse(existingData);
      console.log(`\nLoaded ${existingScores.length} existing scores`);
    } catch (error) {
      console.log('\nNo existing scores found, creating new file');
    }

    // Merge new scores with existing scores (avoid duplicates)
    // Create a unique key from songName + artist + date
    const getUniqueKey = (score: KaraokeScore) =>
      `${score.songName}||${score.artist}||${score.date}||${score.scoringType}`;

    const existingKeys = new Set(existingScores.map(getUniqueKey));
    const newScores = allScores.filter(score => !existingKeys.has(getUniqueKey(score)));

    console.log(`Found ${newScores.length} new scores to add`);

    // Combine existing and new scores
    const combinedScores = [...existingScores, ...newScores];

    // Sort by score (descending)
    combinedScores.sort((a, b) => b.score - a.score);

    // Save to JSON file
    await fs.writeFile(outputPath, JSON.stringify(combinedScores, null, 2), 'utf-8');
    console.log(`\nScores saved to ${outputPath} (total: ${combinedScores.length})`);

    // Also save to public directory for web app
    const publicPath = path.join(__dirname, 'public', 'scores.json');
    await fs.writeFile(publicPath, JSON.stringify(combinedScores, null, 2), 'utf-8');
    console.log(`Scores also saved to ${publicPath}`);

    // Display top 10
    console.log('\n=== Top 10 scores ===');
    combinedScores.slice(0, 10).forEach((score, index) => {
      console.log(`${index + 1}. ${score.songName} - ${score.artist}: ${score.score} (${score.date})`);
    });

    // Display statistics
    const avgScore = combinedScores.reduce((sum, s) => sum + s.score, 0) / combinedScores.length;
    console.log(`\n=== Statistics ===`);
    console.log(`Total songs: ${combinedScores.length}`);
    console.log(`Average score: ${avgScore.toFixed(2)}`);
    console.log(`Highest score: ${combinedScores[0].score}`);
    console.log(`Lowest score: ${combinedScores[combinedScores.length - 1].score}`);

    return combinedScores;
  } catch (error) {
    console.error('Error during scraping:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

scrapeKaraokeScores()
  .then(scores => {
    console.log(`\nScraping completed successfully! Total scores: ${scores.length}`);
  })
  .catch(error => {
    console.error('Failed to scrape karaoke scores:', error);
    process.exit(1);
  });
