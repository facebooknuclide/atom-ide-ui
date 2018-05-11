/**
 * Copyright (c) 2017-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @flow
 * @format
 */

/* eslint-disable nuclide-internal/no-commonjs */

import fs from 'fs';
// eslint-disable-next-line nuclide-internal/prefer-nuclide-uri
import path from 'path';
import UniversalDisposable from 'nuclide-commons/UniversalDisposable';
import FeatureLoader from 'nuclide-commons-atom/FeatureLoader';
import displayNuclideWarning from './display-nuclide-warning';

const featureDir = path.join(__dirname, 'modules/atom-ide-ui/pkg');
const features = fs
  .readdirSync(featureDir)
  .map(item => {
    const dirname = path.join(featureDir, item);
    try {
      const pkgJson = fs.readFileSync(
        path.join(dirname, 'package.json'),
        'utf8',
      );
      return {
        path: dirname,
        pkg: JSON.parse(pkgJson),
      };
    } catch (err) {
      if (err.code !== 'ENOENT' && err.code !== 'ENOTDIR') {
        throw err;
      }
    }
  })
  .filter(Boolean);

/**
 * Use a unified package loader to load all the feature packages.
 * See the following post for more context:
 * https://nuclide.io/blog/2016/01/13/Nuclide-v0.111.0-The-Unified-Package/
 */
let disposables: ?UniversalDisposable;
const featureLoader = new FeatureLoader({
  path: __dirname,
  config: {},
  features,
});
featureLoader.load();

module.exports = {
  activate() {
    disposables = new UniversalDisposable(
      require('nuclide-commons-ui'),
      atom.packages.onDidActivatePackage(pkg => {
        if (pkg.name === 'nuclide') {
          displayNuclideWarning();
        }
      }),
    );
    featureLoader.activate();
  },
  deactivate() {
    featureLoader.deactivate();
    if (disposables != null) {
      disposables.dispose();
      disposables = null;
    }
  },
  serialize() {
    featureLoader.serialize();
  },
};
