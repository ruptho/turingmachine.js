#!/bin/sh


#script to make folder for deployment (copy necessary files to the folder "dist")

rm -R ./dist; mkdir dist
cp index.html normalize.css table.css table.html turingmachine.css turingmachine.js ./dist/
cp -R ./markets ./dist/markets
cp -R ./deps ./dist/deps
cp -R ./static ./dist/static