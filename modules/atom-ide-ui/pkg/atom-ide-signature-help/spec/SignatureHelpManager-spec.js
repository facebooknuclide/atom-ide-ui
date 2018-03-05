'use strict';

var _asyncToGenerator = _interopRequireDefault(require('async-to-generator'));

var _atom = require('atom');

var _testHelpers;

function _load_testHelpers() {
  return _testHelpers = require('nuclide-commons-atom/test-helpers');
}

var _promise;

function _load_promise() {
  return _promise = require('nuclide-commons/promise');
}

var _UniversalDisposable;

function _load_UniversalDisposable() {
  return _UniversalDisposable = _interopRequireDefault(require('nuclide-commons/UniversalDisposable'));
}

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Copyright (c) 2017-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * 
 * @format
 */

describe('SignatureHelpManager', () => {
  let disposable;
  let testProvider;
  let mockDatatipService;
  let editor;

  beforeEach(() => {
    waitsForPromise((0, _asyncToGenerator.default)(function* () {
      (0, (_testHelpers || _load_testHelpers()).jasmineAttachWorkspace)();
      jasmine.useMockClock();
      atom.packages.activatePackage('atom-ide-signature-help');

      editor = yield atom.workspace.open();

      testProvider = {
        priority: 1,
        grammarScopes: ['text.plain.null-grammar'],
        triggerCharacters: new Set(['(']),
        getSignatureHelp: jasmine.createSpy().andReturn(Promise.resolve({
          signatures: [{
            label: 'test signature'
          }]
        }))
      };
      mockDatatipService = {
        addProvider() {
          throw Error();
        },
        addModifierProvider() {
          throw Error();
        },
        createPinnedDataTip: jasmine.createSpy().andReturn(new (_UniversalDisposable || _load_UniversalDisposable()).default())
      };
      atom.packages.serviceHub.consume('signature-help', '0.1.0', function (registry) {
        disposable = registry(testProvider);
      });
      atom.packages.serviceHub.provide('datatip', '0.1.0', mockDatatipService);

      // Active editor debounce.
      advanceClock(500);
    }));
  });

  afterEach(() => {
    disposable.dispose();
  });

  it('responds to manual triggers', () => {
    waitsForPromise((0, _asyncToGenerator.default)(function* () {
      editor.insertText('test');
      atom.commands.dispatch(editor.getElement(), 'signature-help:show');

      const signatureSpy = testProvider.getSignatureHelp;
      expect(signatureSpy.callCount).toBe(1);
      expect(signatureSpy.calls[0].args).toEqual([editor, new _atom.Point(0, 4)]);

      // Wait for promise to be resolved.
      yield (0, (_promise || _load_promise()).nextTick)();

      const datatipSpy = mockDatatipService.createPinnedDataTip;
      expect(datatipSpy.callCount).toBe(1);
      expect(datatipSpy.calls[0].args[0].range).toEqual(new _atom.Range([0, 4], [0, 4]));

      // Moving the cursor should immediately move the datatip and query again.
      editor.setCursorBufferPosition([0, 3]);

      expect(datatipSpy.callCount).toBe(2);
      expect(datatipSpy.calls[1].args[0].range).toEqual(new _atom.Range([0, 3], [0, 3]));

      // Compensate for the debounce.
      advanceClock(500);
      expect(signatureSpy.callCount).toBe(2);
      expect(signatureSpy.calls[1].args).toEqual([editor, new _atom.Point(0, 3)]);

      // Wait for promise to be resolved.
      yield (0, (_promise || _load_promise()).nextTick)();
      expect(datatipSpy.callCount).toBe(3);

      // Once the signature returns null, abort the flow.
      signatureSpy.andReturn(Promise.resolve(null));
      editor.setCursorBufferPosition([0, 0]);

      // No repositioning when the cursor moves too far.
      expect(datatipSpy.callCount).toBe(3);

      // Compensate for the debounce.
      advanceClock(500);
      expect(signatureSpy.callCount).toBe(3);

      yield (0, (_promise || _load_promise()).nextTick)();
      expect(datatipSpy.callCount).toBe(3);

      editor.setCursorBufferPosition([0, 1]);
      advanceClock(500);
      expect(signatureSpy.callCount).toBe(3);
    }));
  });

  it('responds to typing trigger characters', () => {
    waitsForPromise((0, _asyncToGenerator.default)(function* () {
      editor.insertText('a');
      advanceClock(1); // debounce
      const signatureSpy = testProvider.getSignatureHelp;
      expect(signatureSpy.callCount).toBe(0);

      editor.insertText('(');
      advanceClock(1); // debounce
      expect(signatureSpy.callCount).toBe(1);
      expect(signatureSpy.calls[0].args).toEqual([editor, new _atom.Point(0, 2)]);

      // We've tested the regular flow above; test cancellation too.
      /* global KeyboardEvent */
      const escape = new KeyboardEvent('keydown');
      // No APi to set keyCode :(
      Object.defineProperty(escape, 'keyCode', { value: 27 });
      editor.getElement().dispatchEvent(escape);

      editor.insertText('x');
      advanceClock(500); // debounce
      expect(signatureSpy.callCount).toBe(1);
    }));
  });

  it('responds to typing over a selection', () => {
    waitsForPromise((0, _asyncToGenerator.default)(function* () {
      editor.setText('(abcdef');
      advanceClock(1); // debounce
      const signatureSpy = testProvider.getSignatureHelp;
      expect(signatureSpy.callCount).toBe(0);

      editor.setSelectedBufferRange(new _atom.Range([0, 0], [0, 1]));
      editor.insertText('(');
      expect(editor.getText()).toBe('(abcdef');
      advanceClock(1); // debounce
      expect(signatureSpy.callCount).toBe(1);
      expect(signatureSpy.calls[0].args).toEqual([editor, new _atom.Point(0, 1)]);
    }));
  });
});