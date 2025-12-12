import { runGenomeLinter } from "../src/genome/index";

async function main() {
  const result = await runGenomeLinter();
  if (result.totalErrors > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Genome validation failed to execute", error);
  process.exit(1);
});
