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

import type {NuclideUri} from 'nuclide-commons/nuclideUri';
import type {DiagnosticMessage} from '../../atom-ide-diagnostics/lib/types';

export type FilterType = 'errors' | 'warnings' | 'feedback';

// State that's shared between every diagnostics panel instance.
export type GlobalViewState = {
  diagnostics: Array<DiagnosticMessage>,
  pathToActiveTextEditor: ?NuclideUri,
  filterByActiveTextEditor: boolean,
  onFilterByActiveTextEditorChange: (isChecked: boolean) => mixed,
  showTraces: boolean,
  onShowTracesChange: (isChecked: boolean) => mixed,
};
