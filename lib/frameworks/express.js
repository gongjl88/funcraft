'use strict';

const { promptForConfirmContinue } = require('../init/prompt');
const { yellow, red } = require('colors');
const fs = require('fs-extra');
const path = require('path');
const _ = require('lodash');

const express = {
  "id": "express",
  "name": "Express",
  "runtime": 'nodejs',
  "website": "http://www.expressjs.com.cn/",
  "detectors": {
    "and": [
      {
        "type": "regex",
        "path": "package.json",
        "content": "\"(dev)?(d|D)ependencies\":\\s*{[^}]*\"express\":\\s*\".+?\"[^}]*}"
      }
    ]
  },
  "actions": [
    {
      "name": "express-generator",
      "condition": {
        "and": [
          {
            "type": "json",
            "path": "package.json",
            "jsonKey": "scripts.start",
            "jsonValueContains": "bin/www"
          },
          {
            "type": "contains",
            "path": "bin/www",
            "content": "process.env.PORT"
          }
        ]
      },
      "description": "generated by express-generator",
      "processors": [
        {
          "type": "generateFile",
          "path": "bootstrap",
          "mode": "0755",
          "content": `#!/usr/bin/env bash
export PORT=9000
npm run start
`
        }
      ]
    },
    {
      "name": "express-custom-port",
      "condition": {
        "and": [
          {
            "type": "json",
            "path": "package.json",
            "jsonKey": "scripts.start"
          },
          {
            "type": "regex",
            "paths": ["index.js", "application.js", "server.js"],
            "content": "\\.listen\\s*\\(\\s*(\\d+)\\s*,"
          }
        ],
      },
      "description": "application created by self",
      "processors": [
        {
          "type": "function",
          "function": async (codeDir) => {
            const regex = new RegExp('\\.listen\\s*\\(\\s*(\\d+)\\s*,', 'm');
            const paths = ["index.js", "application.js", "server.js"];
            for (const p of paths) {
              const indexPath = path.join(codeDir, p);
              if (!await fs.pathExists(indexPath)) continue;

              const indexContent = (await fs.readFile(indexPath)).toString();
              const matched = indexContent.match(regex);
              if (matched) {
                const port = matched[1];
                // todo: index.js
                console.log(yellow(`Fun detected your application use port ${port} in ${p}`));
                console.log(yellow(`Fun will replace your port ${port} to 'process.env.PORT || ${port}', and also backup your origin file ${p} to ${p}.bak`));

                if (!await promptForConfirmContinue(yellow(`Are your sure?`))) {
                  console.warn(red("Fun will not modify your application port, but if you want deploy to fc, you must use 9000 as your application server port"));
                  return;
                }

                const replacedContent = indexContent.replace(regex, (match, p1) => {
                  return `.listen(process.env.PORT || ${p1},`;
                });

                await fs.copyFile(indexPath, indexPath + ".bak");
                await fs.writeFile(indexPath, replacedContent);
              }
            }
          }
        },
        {
          "type": "generateFile",
          "path": "bootstrap",
          "mode": parseInt('0755', 8),
          "content": `#!/usr/bin/env bash
export PORT=9000
npm run start`
        }
      ]
    }
  ]
};

module.exports = express;