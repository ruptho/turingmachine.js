#!/bin/sh

rm -R ./dist; mkdir dist
cp index.html normalize.css table.css table.html turingmachine.css turingmachine.js ./dist/
cp -R ./markets ./dist/markets
cp -R ./deps ./dist/deps
cp -R ./static ./dist/static