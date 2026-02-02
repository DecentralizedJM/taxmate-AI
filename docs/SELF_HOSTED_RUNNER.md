# Self-Hosted Runner (CI Without Hosted Billing)

Use this if GitHub-hosted runners are blocked (e.g., billing lock) and you still want CI green.

## Quick Steps (Linux)

1) Go to **Repo → Settings → Actions → Runners → New self-hosted runner**  
2) Choose **Linux x64**, copy the commands, then on your machine/VM:
   ```bash
   # Example; use the exact URL/token GitHub shows you
   mkdir -p ~/actions-runner && cd ~/actions-runner
   curl -o actions-runner-linux-x64.tar.gz -L https://github.com/actions/runner/releases/download/v2.316.0/actions-runner-linux-x64-2.316.0.tar.gz
   tar xzf actions-runner-linux-x64.tar.gz

   # Configure with the repo URL and token from GitHub UI
   ./config.sh --url https://github.com/DecentralizedJM/taxmate-AI --token REPLACE_WITH_TOKEN
   ```
3) Start the runner:
   ```bash
   ./run.sh
   ```
   For a service install (auto-start), follow GitHub’s service setup instructions shown after `config.sh`.

## Use the Runner in CI

The workflow already uses `ubuntu-latest`. To force your self-hosted runner, set `runs-on` to include `self-hosted` (and any labels you configured):
```yaml
runs-on: [self-hosted, linux, x64]
```

Example override in `.github/workflows/ci.yml` (per job):
```yaml
jobs:
  backend:
    runs-on: [self-hosted, linux, x64]
    ...
  frontend:
    runs-on: [self-hosted, linux, x64]
    ...
```

## Notes
- Keep the runner online while workflows run.
- If you add labels during `config.sh`, include them in `runs-on`.
- Self-hosted runners execute your code—use a trusted machine/VM.
