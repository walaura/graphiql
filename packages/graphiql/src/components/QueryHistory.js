/**
 *  Copyright (c) 2019 GraphQL Contributors.
 *
 *  This source code is licensed under the MIT license found in the
 *  LICENSE file in the root directory of this source tree.
 */

import { parse } from 'graphql';
import React from 'react';
import PropTypes from 'prop-types';
import QueryStore from '../utility/QueryStore';
import HistoryQuery from './HistoryQuery';

const MAX_QUERY_SIZE = 100000;
const MAX_HISTORY_LENGTH = 20;

const shouldSaveQuery = (query, variables, lastQuerySaved) => {
  try {
    parse(query);
  } catch (e) {
    return false;
  }
  // Don't try to save giant queries
  if (query.length > MAX_QUERY_SIZE) {
    return false;
  }
  if (!lastQuerySaved) {
    return true;
  }
  if (JSON.stringify(query) === JSON.stringify(lastQuerySaved.query)) {
    if (
      JSON.stringify(variables) === JSON.stringify(lastQuerySaved.variables)
    ) {
      return false;
    }
    if (variables && !lastQuerySaved.variables) {
      return false;
    }
  }
  return true;
};

export class QueryHistory extends React.Component {
  static propTypes = {
    query: PropTypes.string,
    variables: PropTypes.string,
    operationName: PropTypes.string,
    queryID: PropTypes.number,
    onSelectQuery: PropTypes.func,
    storage: PropTypes.object,
  };

  constructor(props) {
    super(props);
    this.historyStore = new QueryStore(
      'queries',
      props.storage,
      MAX_HISTORY_LENGTH,
    );
    // favorites are not automatically deleted, so there's no need for a max length
    this.favoriteStore = new QueryStore('favorites', props.storage, null);
    const historyQueries = this.historyStore.fetchAll();
    const favoriteQueries = this.favoriteStore.fetchAll();
    const queries = historyQueries.concat(favoriteQueries);
    this.state = { queries };
  }

  render() {
    const queries = this.state.queries.slice().reverse();
    const queryNodes = queries.map((query, i) => {
      return (
        <HistoryQuery
          handleEditLabel={this.editLabel}
          handleToggleFavorite={this.toggleFavorite}
          key={`${i}:${query.label || query.query}`}
          onSelect={this.props.onSelectQuery}
          {...query}
        />
      );
    });
    return (
      <section aria-label="History">
        <div className="history-title-bar">
          <div className="history-title">{'History'}</div>
          <div className="doc-explorer-rhs">{this.props.children}</div>
        </div>
        <ul className="history-contents">{queryNodes}</ul>
      </section>
    );
  }

  // Public API
  updateHistory = (query, variables, operationName) => {
    if (shouldSaveQuery(query, variables, this.historyStore.fetchRecent())) {
      this.historyStore.push({
        query,
        variables,
        operationName,
      });
      const historyQueries = this.historyStore.items;
      const favoriteQueries = this.favoriteStore.items;
      const queries = historyQueries.concat(favoriteQueries);
      this.setState({
        queries,
      });
    }
  };

  // Public API
  toggleFavorite = (query, variables, operationName, label, favorite) => {
    const item = {
      query,
      variables,
      operationName,
      label,
    };
    if (!this.favoriteStore.contains(item)) {
      item.favorite = true;
      this.favoriteStore.push(item);
    } else if (favorite) {
      item.favorite = false;
      this.favoriteStore.delete(item);
    }
    this.setState({
      queries: [...this.historyStore.items, ...this.favoriteStore.items],
    });
  };

  // Public API
  editLabel = (query, variables, operationName, label, favorite) => {
    const item = {
      query,
      variables,
      operationName,
      label,
    };
    if (favorite) {
      this.favoriteStore.edit({ ...item, favorite });
    } else {
      this.historyStore.edit(item);
    }
    this.setState({
      queries: [...this.historyStore.items, ...this.favoriteStore.items],
    });
  };
}
