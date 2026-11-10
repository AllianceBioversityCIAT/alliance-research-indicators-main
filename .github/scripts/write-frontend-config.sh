#!/usr/bin/env bash
# Writes the STAR DEV frontend configuration from Secrets Manager to the git-ignored file the client expects, as
# the Jenkins DEV job does (devops PIPES/ALLIANCE-INDICATORS/monorepo/dev/Jenkinsfile, stage 'Startup Frontend':
# the SecretString to client/research-indicators/src/environments/environment.ts).
# Adapted from onecgiar_pr .github/scripts/write-frontend-config.sh (Reporting Tool DEV): STAR path, one file.
#
# The value goes from the AWS CLI straight to the file: it is never echoed and never a step or job output; only
# its string literals are read back to register log masks. The file is mode 0600 and removed by the workflow's
# `if: always()` step (remove-frontend-config.sh).
# Inputs (environment): SECRET_ID, AWS_REGION and the step-scoped temporary credentials.
set -euo pipefail
: "${SECRET_ID:?}" "${AWS_REGION:?}"

file="client/research-indicators/src/environments/environment.ts"

# Refuse to write anywhere git would track: the file must stay ignored.
git check-ignore -q "$file" || { echo "::error::the frontend environment file is not git-ignored (fail closed)"; exit 1; }

umask 077
if ! aws secretsmanager get-secret-value --region "$AWS_REGION" --secret-id "$SECRET_ID" \
       --query SecretString --output text > "$file" 2> /dev/null; then
  rm -f "$file"
  # The CLI error is not printed: it may quote request details.
  echo "::error::could not read the frontend configuration secret (check the build role and the secret id)"
  exit 1
fi
if [ ! -s "$file" ]; then
  rm -f "$file"
  echo "::error::the frontend configuration secret is empty (fail closed)"
  exit 1
fi

# Defense in depth only (the protection is that nothing prints the file): register every quoted string value of
# 8+ characters as a log mask, so an accidental echo in a later step of this job shows `***`.
# Workflow commands are consumed by the runner and never shown in the log.
masked=0
while IFS= read -r value; do
  value="${value%%[\'\"]}"; value="${value#[\'\"]}"
  value="${value//'%'/'%25'}"
  [ "${#value}" -ge 8 ] || continue
  echo "::add-mask::${value}"
  masked=$((masked + 1))
done < <(grep -oE "'[^'\\\\]{8,}'|\"[^\"\\\\]{8,}\"" "$file" || true)

echo "frontend configuration written (1 file, mode 0600, ${masked} values masked)"
