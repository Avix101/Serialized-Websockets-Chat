const path = require('path');
const express = require('express');

const attach = (app) => {
  app.use('/assets', express.static(path.resolve(`${__dirname}/../hosted/`)));

  app.get('/', (req, res) => {
    res.sendFile(path.resolve(`${__dirname}/../hosted/index.html`));
  });
};

module.exports = {
  attach,
};
