<?php
// Server-side GitHub config for the MasterWriter panel.
//
// Copy this file to config.php (gitignored — never commit real credentials)
// and fill in a fine-grained personal access token:
//   github.com -> Settings -> Developer settings -> Fine-grained tokens
//   Repository access: only MAXGAZINE
//   Permissions: Contents (read & write), Actions (read & write)
//
// Every signed-in writer publishes through this one token; no per-user
// GitHub login is needed.

const MW_GH_TOKEN    = 'github_pat_xxxxxxxxxxxxxxxxxxxxxxxx';
const MW_GH_OWNER    = 'amirHafeziV';
const MW_GH_REPO     = 'MAXGAZINE';
const MW_GH_BRANCH   = 'main';
const MW_SITE_ORIGIN = 'https://maxgazine.com';
