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

import type {AbortSignal} from 'nuclide-commons/AbortController';
import type {DefinitionQueryResult} from './types';
import {wordAtPosition} from 'nuclide-commons-atom/range';
import {isPositionInRange} from 'nuclide-commons/range';
import UniversalDisposable from 'nuclide-commons/UniversalDisposable';

// An atom$Range-aware, single-item cache for the common case of requerying
// a definition (such as previewing hyperclick and then jumping to the
// destination). It invalidates whenever the originating editor changes.
class DefinitionCache {
  _cachedResultEditor: ?atom$TextEditor;
  _cachedResultPromise: ?Promise<?DefinitionQueryResult>;
  _cachedResultRange: ?atom$Range;
  _disposables: UniversalDisposable = new UniversalDisposable();

  dispose() {
    this._disposables.dispose();
  }

  async get(
    editor: atom$TextEditor,
    position: atom$Point,
    options: ?{signal: AbortSignal},
    getImpl: () => Promise<?DefinitionQueryResult>,
  ): Promise<?DefinitionQueryResult> {
    // queryRange is often a list of one range
    if (
      this._cachedResultRange != null &&
      this._cachedResultEditor === editor &&
      isPositionInRange(position, this._cachedResultRange)
    ) {
      try {
        return await this._cachedResultPromise;
      } catch (err) {
        // If the cached promise was aborted, fall through.
        if (err == null || err.name !== 'AbortError') {
          throw err;
        }
      }
    }
    if (options && options.signal.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }

    // invalidate whenever the buffer changes
    const invalidateAndStopListening = () => {
      this._cachedResultEditor = null;
      this._cachedResultRange = null;
      this._cachedResultRange = null;
      this._disposables.remove(editorDisposables);
      editorDisposables.dispose();
    };
    const editorDisposables = new UniversalDisposable(
      editor.getBuffer().onDidChangeText(invalidateAndStopListening),
      editor.onDidDestroy(invalidateAndStopListening),
    );
    if (options != null) {
      options.signal.addEventListener('abort', invalidateAndStopListening);
      editorDisposables.add(() => {
        options.signal.removeEventListener('abort', invalidateAndStopListening);
      });
    }
    this._disposables.add(editorDisposables);

    const wordGuess = wordAtPosition(editor, position);
    this._cachedResultRange = wordGuess && wordGuess.range;
    this._cachedResultEditor = editor;
    this._cachedResultPromise = getImpl().then(result => {
      // Rejected providers turn into null values here.
      // Invalidate the cache to ensure that the user can retry the request.
      if (result == null) {
        invalidateAndStopListening();
      }
      return result;
    });

    return this._cachedResultPromise;
  }
}

export default DefinitionCache;
