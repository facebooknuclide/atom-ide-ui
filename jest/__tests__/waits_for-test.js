/**
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 *
 * @flow strict
 * @format
 */

import waitsFor from '../waits_for';

it('waits', async () => {
  let condition = false;
  Promise.resolve().then(() => (condition = true));
  await waitsFor(() => condition);
});

it("can't wait anymore", async () => {
  await expect(waitsFor(() => false, undefined, 1)).rejects.toThrow(
    'but it never did',
  );
});

it('gives a message', async () => {
  await expect(waitsFor(() => false, 'lol', 1)).rejects.toThrow('lol');
});
