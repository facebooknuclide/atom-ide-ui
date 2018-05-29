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

import type {
  HyperclickProvider,
  HyperclickSuggestion,
} from '../../hyperclick/lib/types';
import type {DefinitionProvider} from '../lib/types';

import {Point, Range, TextEditor} from 'atom';
import invariant from 'assert';
import AbortController from 'nuclide-commons/AbortController';
import UniversalDisposable from 'nuclide-commons/UniversalDisposable';

describe('DefinitionHyperclick', () => {
  let provider: ?HyperclickProvider;
  const definitionProvider: DefinitionProvider = {
    priority: 20,
    name: '',
    grammarScopes: ['text.plain.null-grammar'],
    getDefinition: () => Promise.resolve(null),
  };
  let editor: TextEditor;
  const position = new Point(0, 0);
  let goToLocation;
  let disposables;

  beforeEach(() => {
    atom.packages.activatePackage('atom-ide-definitions');
    editor = new TextEditor();

    goToLocation = spyOn(
      require('nuclide-commons-atom/go-to-location'),
      'goToLocation',
    );

    disposables = new UniversalDisposable(
      atom.packages.serviceHub.provide(
        'definitions',
        '0.1.0',
        definitionProvider,
      ),
      atom.packages.serviceHub.consume('hyperclick', '1.0.0', x => {
        provider = x;
      }),
    );
  });

  afterEach(() => {
    disposables.dispose();
  });

  it('no definition service', () => {
    waitsForPromise(async () => {
      spyOn(editor, 'getGrammar').andReturn({scopeName: 'blah'});
      invariant(provider != null);
      invariant(provider.getSuggestion != null);
      const result = await provider.getSuggestion(editor, position);
      expect(result).toBe(null);
    });
  });

  it('no definition', () => {
    waitsForPromise(async () => {
      const spy = spyOn(definitionProvider, 'getDefinition').andReturn(null);
      invariant(provider != null);
      invariant(provider.getSuggestion != null);
      const result = await provider.getSuggestion(editor, position);

      expect(result).toBe(null);
      expect(spy).toHaveBeenCalledWith(editor, position, undefined);
    });
  });

  it('definition - single', () => {
    waitsForPromise(async () => {
      const definition = {
        queryRange: [new Range(new Point(1, 1), new Point(1, 5))],
        definitions: [
          {
            path: 'path1',
            position: new Point(1, 2),
            range: null,
            id: 'symbol-name',
            name: null,
            projectRoot: null,
          },
        ],
      };
      const spy = spyOn(definitionProvider, 'getDefinition').andReturn(
        Promise.resolve(definition),
      );

      invariant(provider != null);
      invariant(provider.getSuggestion != null);
      const result = await provider.getSuggestion(editor, position);

      invariant(result != null);
      expect(result.range).toEqual(definition.queryRange);
      expect(spy).toHaveBeenCalledWith(editor, position, undefined);
      expect(goToLocation).not.toHaveBeenCalled();

      invariant(result != null);
      invariant(result.callback != null);
      invariant(typeof result.callback === 'function');
      result.callback();
      expect(goToLocation).toHaveBeenCalledWith('path1', {line: 1, column: 2});
    });
  });

  it('definition - multiple', () => {
    waitsForPromise(async () => {
      const defs = {
        queryRange: [new Range(new Point(1, 1), new Point(1, 5))],
        definitions: [
          {
            path: '/a/b/path1',
            position: new Point(1, 2),
            range: null,
            id: 'symbol-name',
            name: 'd1',
            projectRoot: '/a',
          },
          {
            path: '/a/b/path2',
            position: new Point(3, 4),
            range: null,
            id: 'symbol-name2',
            name: 'd2',
            projectRoot: '/a',
          },
          {
            path: '/a/b/path3',
            position: new Point(3, 4),
            range: null,
            id: 'symbol-without-name',
            projectRoot: '/a',
          },
        ],
      };
      const spy = spyOn(definitionProvider, 'getDefinition').andReturn(
        Promise.resolve(defs),
      );

      invariant(provider != null);
      invariant(provider.getSuggestion != null);
      const result: ?HyperclickSuggestion = await provider.getSuggestion(
        editor,
        position,
      );

      invariant(result != null);
      expect(result.range).toEqual(defs.queryRange);
      expect(spy).toHaveBeenCalledWith(editor, position, undefined);
      expect(goToLocation).not.toHaveBeenCalled();
      const callbacks: Array<{
        title: string,
        callback: () => mixed,
      }> = (result.callback: any);

      expect(callbacks.length).toBe(3);
      expect(callbacks[0].title).toBe('d1 (b/path1)');
      expect(typeof callbacks[0].callback).toBe('function');
      expect(callbacks[1].title).toBe('d2 (b/path2)');
      expect(typeof callbacks[1].callback).toBe('function');
      expect(callbacks[2].title).toBe('b/path3:4');
      expect(typeof callbacks[2].callback).toBe('function');

      callbacks[1].callback();
      expect(goToLocation).toHaveBeenCalledWith('/a/b/path2', {
        line: 3,
        column: 4,
      });
    });
  });

  it('is able to cancel definition requests', () => {
    waitsForPromise(async () => {
      const spy = spyOn(definitionProvider, 'getDefinition').andCallFake(
        (_editor, _position, options) =>
          new Promise((resolve, reject) => {
            options.signal.onabort = () =>
              reject(new DOMException('Aborted', 'AbortError'));
          }),
      );

      invariant(provider != null);
      invariant(provider.getSuggestion != null);
      const controller = new AbortController();
      const options = {signal: controller.signal};
      const suggestionPromise = provider
        .getSuggestion(editor, position, options)
        .catch(err => err);

      expect(spy).toHaveBeenCalledWith(editor, position, options);
      controller.abort();
      const result = await suggestionPromise;
      expect(result.name).toEqual('AbortError');
    });
  });

  it('falls back to lower-priority providers', () => {
    waitsForPromise(async () => {
      const def = {
        queryRange: [new Range(new Point(1, 1), new Point(1, 5))],
        definitions: [
          {
            path: 'path1',
            position: new Point(1, 2),
            range: null,
            id: 'symbol-name',
            name: null,
            projectRoot: null,
          },
        ],
      };
      const newProvider = {
        priority: 10,
        name: '',
        grammarScopes: ['text.plain.null-grammar'],
        getDefinition: () => Promise.resolve(def),
      };
      atom.packages.serviceHub.provide('definitions', '0.1.0', newProvider);
      invariant(provider != null);
      invariant(provider.getSuggestion != null);
      const result = await provider.getSuggestion(editor, position);
      expect(result).not.toBe(null);
      invariant(result != null);
      expect(result.range).toEqual(def.queryRange);
    });
  });

  it('does not cache null values', () => {
    waitsForPromise(async () => {
      editor.setText('test');
      const def = {
        queryRange: [new Range(new Point(1, 1), new Point(1, 5))],
        definitions: [
          {
            path: 'path1',
            position: new Point(1, 2),
            range: null,
            id: 'symbol-name',
            name: null,
            projectRoot: null,
          },
        ],
      };
      const newProvider = {
        priority: 10,
        name: '',
        grammarScopes: ['text.plain.null-grammar'],
        getDefinition: () => Promise.resolve(null),
      };
      atom.packages.serviceHub.provide('definitions', '0.1.0', newProvider);
      invariant(provider != null);
      invariant(provider.getSuggestion != null);
      let result = await provider.getSuggestion(editor, position);
      expect(result).toBe(null);

      newProvider.getDefinition = () => Promise.resolve(def);
      invariant(provider.getSuggestion != null);
      result = await provider.getSuggestion(editor, position);
      invariant(result != null);
      expect(result.range).toEqual(def.queryRange);
    });
  });
});
