import { runArticlePipeline, runRankings, runForecasts } from "./orchestrator.js";

const USAGE = `MAXGAZINE agents

Usage: tsx src/index.ts <command> [options]

Commands:
  publish-article [n]   Scout, write, fact-check, translate, SEO and publish n articles (default 1)
  update-rankings       Re-score the exchange and broker tables
  update-forecasts      Refresh the Future desk forecasts
  all [n]               Run all of the above (publishes n articles)
`;

async function main() {
  const [cmd, arg] = process.argv.slice(2);
  switch (cmd) {
    case "publish-article":
      await runArticlePipeline(arg ? Number(arg) : 1);
      break;
    case "update-rankings":
      await runRankings();
      break;
    case "update-forecasts":
      await runForecasts();
      break;
    case "all":
      await runArticlePipeline(arg ? Number(arg) : 1);
      await runRankings();
      await runForecasts();
      break;
    default:
      console.log(USAGE);
      process.exit(cmd ? 1 : 0);
  }
}

main().catch((err) => {
  console.error("[agents] fatal:", err);
  process.exit(1);
});
