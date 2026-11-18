# ONU Tools

A simple web tool for preparing ZTE OLT configuration for ONUs. It never connects to your OLT. It generates text that you copy and paste into the OLT terminal yourself.

## Features

- **ONU Config Generator**: builds the full config for a single ONU, with options for new or already registered ONUs and an optional TR69 setup.
- **Batch TR69**: adds TR69 config to many ONUs at once. It checks the existing config first, so nothing already in use gets overwritten.

## How to use

1. Open `index.html` in a browser.
2. Click **Setting ACS** (top right) and enter your ACS details once.
3. Pick a view from the dropdown, fill in the form, copy the result, and paste it into the OLT.

## Notes

- Your ACS details are kept in your own browser and are not part of the code.
- Always try the generated config on one ONU first, then check that it shows up in your ACS before applying it more widely.