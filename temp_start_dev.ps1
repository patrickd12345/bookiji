$job = Start-Job -ScriptBlock { npx dotenv-cli -e .env.e2e -- pnpm dev }
Write-Output $job.Id
