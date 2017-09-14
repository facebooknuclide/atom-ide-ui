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
import type {DiagnosticMessage} from '../../../atom-ide-diagnostics/lib/types';
import type {FilterType} from '../types';
import type {
  RegExpFilterChange,
  RegExpFilterValue,
} from 'nuclide-commons-ui/RegExpFilter';

import analytics from 'nuclide-commons-atom/analytics';
import ExperimentalDiagnosticsTable from './ExperimentalDiagnosticsTable';
import {Toolbar} from 'nuclide-commons-ui/Toolbar';
import {ToolbarLeft} from 'nuclide-commons-ui/ToolbarLeft';
import {ToolbarRight} from 'nuclide-commons-ui/ToolbarRight';
import * as React from 'react';
import {Button, ButtonSizes} from 'nuclide-commons-ui/Button';
import {ButtonGroup} from 'nuclide-commons-ui/ButtonGroup';
import FilterButton from './FilterButton';
import RegExpFilter from 'nuclide-commons-ui/RegExpFilter';

export type Props = {
  diagnostics: Array<DiagnosticMessage>,
  pathToActiveTextEditor: ?NuclideUri,
  filterByActiveTextEditor: boolean,
  onFilterByActiveTextEditorChange: (isChecked: boolean) => mixed,
  showTraces: boolean,
  onShowTracesChange: (isChecked: boolean) => mixed,
  gotoMessageLocation: (message: DiagnosticMessage) => void,
  selectedMessage: ?DiagnosticMessage,

  hiddenTypes: Set<FilterType>,
  onTypeFilterChange: (type: FilterType) => mixed,
  textFilter: RegExpFilterValue,
  onTextFilterChange: (change: RegExpFilterChange) => mixed,
};

/**
 * Dismissable panel that displays the diagnostics from nuclide-diagnostics-store.
 */
export default class ExperimentalDiagnosticsView extends React.Component<
  Props,
> {
  constructor(props: Props) {
    super(props);
    (this: any)._onShowTracesChange = this._onShowTracesChange.bind(this);
    (this: any)._onFilterByActiveTextEditorChange = this._onFilterByActiveTextEditorChange.bind(
      this,
    );
    (this: any)._openAllFilesWithErrors = this._openAllFilesWithErrors.bind(
      this,
    );
  }

  render(): React.Element<any> {
    let {diagnostics} = this.props;
    const {showTraces} = this.props;
    if (this.props.filterByActiveTextEditor) {
      const pathToFilterBy = this.props.pathToActiveTextEditor;
      if (pathToFilterBy !== null) {
        diagnostics = diagnostics.filter(
          diagnostic =>
            diagnostic.scope === 'file' &&
            diagnostic.filePath === pathToFilterBy,
        );
      } else {
        // Current pane is not a text editor; do not show diagnostics.
        diagnostics = [];
      }
    }

    return (
      <div
        style={{
          display: 'flex',
          flex: 1,
          flexDirection: 'column',
          width: '100%',
        }}>
        <Toolbar location="top">
          <ToolbarLeft>
            <ButtonGroup>
              {['errors', 'warnings', 'feedback'].map(type =>
                <FilterButton
                  key={type}
                  type={type}
                  selected={!this.props.hiddenTypes.has(type)}
                  onClick={() => {
                    this.props.onTypeFilterChange(type);
                  }}
                />,
              )}
            </ButtonGroup>
          </ToolbarLeft>
          <ToolbarRight>
            <RegExpFilter
              value={this.props.textFilter}
              onChange={this.props.onTextFilterChange}
            />
            <Button
              onClick={this._openAllFilesWithErrors}
              size={ButtonSizes.SMALL}
              disabled={diagnostics.length === 0}
              className="inline-block"
              title="Open All">
              Open All
            </Button>
          </ToolbarRight>
        </Toolbar>
        <ExperimentalDiagnosticsTable
          showFileName={!this.props.filterByActiveTextEditor}
          diagnostics={diagnostics}
          showTraces={showTraces}
          selectedMessage={this.props.selectedMessage}
          gotoMessageLocation={this.props.gotoMessageLocation}
        />
      </div>
    );
  }

  _onShowTracesChange(isChecked: boolean) {
    analytics.track('diagnostics-panel-toggle-show-traces', {
      isChecked: isChecked.toString(),
    });
    this.props.onShowTracesChange.call(null, isChecked);
  }

  _onFilterByActiveTextEditorChange(isChecked: boolean) {
    analytics.track('diagnostics-panel-toggle-current-file', {
      isChecked: isChecked.toString(),
    });
    this.props.onFilterByActiveTextEditorChange.call(null, isChecked);
  }

  _openAllFilesWithErrors() {
    atom.commands.dispatch(
      atom.views.getView(atom.workspace),
      'diagnostics:open-all-files-with-errors',
    );
  }
}
