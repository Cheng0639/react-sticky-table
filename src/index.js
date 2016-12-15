import React, { Component, PropTypes } from 'react';

var _ = require('underscore');
var proxy = require('nodeproxy');
var elementResizeEvent = require('element-resize-event');

import Table from './Table';
import Row from './Row';
import Cell from './Cell';

/**
 * StickyTable Component
 * Responsive, dynamically sized fixed headers and columns for tables
 * ------------------------------------------------------------------
 * Intentionally not setting state because we don't want to require
 * a full re-render every time the user scrolls or changes the
 * width of a cell.
 */
class StickyTable extends Component {
  constructor(props) {
    super(props);

    this.id = Math.floor(Math.random() * 1000000000) + '';

    this.rowCount = 0;
    this.columnCount = 0;

    this.stickyColumnCount = props.stickyColumnCount === 0 ? 0 : (this.stickyHeaderCount || 1);
    this.stickyHeaderCount = props.stickyHeaderCount === 0 ? 0 : (this.stickyHeaderCount || 1);

    this.onResize = this.onResize.bind(this);
    this.onColumnResize = this.onColumnResize.bind(this);
    this.onScrollX = this.onScrollX.bind(this);
    this.scrollXScrollbar = _.debounce(this.scrollXScrollbar.bind(this), 100);
    this.scrollYScrollbar = _.debounce(this.scrollYScrollbar.bind(this), 100);
  }

  componentDidMount() {
    this.table = document.getElementById('sticky-table-' + this.id);

    if (this.table) {
      this.realTable = this.table.querySelector('#sticky-table-x-wrapper').firstChild;
      this.xScrollbar = this.table.querySelector('#x-scrollbar');
      this.yScrollbar = this.table.querySelector('#y-scrollbar');
      this.xWrapper = this.table.querySelector('#sticky-table-x-wrapper');
      this.yWrapper = this.table.querySelector('#sticky-table-y-wrapper');
      this.stickyHeader = this.table.querySelector('#sticky-header');
      this.stickyColumn = this.table.querySelector('#sticky-column');

      this.xWrapper.addEventListener('scroll', this.onScrollX);

      elementResizeEvent(this.stickyColumn, this.onColumnResize);
      elementResizeEvent(this.realTable, this.onResize);

      this.onResize();
      this.addScrollBarEventHandlers();
    }
  }

  componentWillUnmount() {
    if (this.table) {
      this.xWrapper.removeEventListener('scroll', this.onScrollX);
    }
  }

  /**
   * Link scrolling on either axis to scrolling in the scrollbar elements
   * @returns {null} no return necessary
   */
  addScrollBarEventHandlers() {
    //X Scrollbars
    this.xScrollbar.addEventListener('scroll', proxy(() => {
      this.xWrapper.scrollLeft = this.xScrollbar.scrollLeft;
    }, this));

    //Y Scrollbars
    this.yWrapper.addEventListener('scroll', this.scrollYScrollbar);
    this.yScrollbar.addEventListener('scroll', proxy(() => {
      this.yWrapper.scrollTop = this.yScrollbar.scrollTop;
    }, this));
  }

  onScrollX() {
    //Sticky header
    var scrollLeft = this.xWrapper.scrollLeft;
    this.stickyHeader.style.transform = 'translate(' + (-1 * scrollLeft) + 'px, 0)';

    //Custom Scrollbar
    this.scrollXScrollbar();
  }

  scrollXScrollbar() {
    this.xScrollbar.scrollLeft = this.xWrapper.scrollLeft
  }
  scrollYScrollbar() {
    this.yScrollbar.scrollTop = this.yWrapper.scrollTop
  }

  /**
   * Handle real cell resize events
   * @returns {null} no return necessary
   */
  onResize() {
    this.setRowHeights();
    this.setColumnWidths();
    this.setScrollBarDims();
  }

  setScrollBarDims() {
    this.table.querySelector('#x-scrollbar div').style.width = this.getSizeWithoutBoxSizing(this.realTable.firstChild).width + 'px';
    this.table.querySelector('#y-scrollbar div').style.height = this.getSizeWithoutBoxSizing(this.realTable).height + 'px';
  }

  /**
   * Handle sticky column resize events
   * @returns {null} no return necessary
   */
  onColumnResize() {
    var columnCell = this.stickyColumn.firstChild.firstChild.childNodes[0];
    var cell = this.realTable.firstChild.firstChild;
    var dims = this.getSizeWithoutBoxSizing(columnCell);

    if (cell) {
      cell.style.width = dims.width + 'px';
      cell.style.minWidth = dims.width + 'px';
      //cell.style.height = dims.height + 'px';
      //cell.style.minHeight = dims.height + 'px';
    }

    this.onResize();
  }

  /**
   * Get the height of each row in the table
   * @returns {null} no return necessary
   */
  setRowHeights() {
    var r, cellToCopy, height;

    if (this.stickyColumnCount) {
      for (r = 0; r < this.rowCount; r++) {
        cellToCopy = this.realTable.childNodes[r].firstChild;

        if (cellToCopy) {
          height = this.getSizeWithoutBoxSizing(cellToCopy).height;

          this.stickyColumn.firstChild.childNodes[r].firstChild.style.height = height + 'px';
        }
      }
    }
  }

  /**
   * Get the width of each column in the table
   * @returns {null} no return necessary
   */
  setColumnWidths() {
    var c, cellToCopy, cellStyle, width, cell;

    if (this.stickyHeaderCount) {
      for (c = 0; c < this.columnCount; c++) {
        cellToCopy = this.realTable.firstChild.childNodes[c];

        if (cellToCopy) {
          width = this.getSizeWithoutBoxSizing(cellToCopy).width;
          cell = this.table.querySelector('#sticky-header-cell-' + c);

          cell.style.width = width + 'px';
          cell.style.minWidth = width + 'px';
        }
      }
    }
  }

  /**
   * Get the jsx cells for sticky columns by copying
   * children elements
   * @param {array} rows provided child row elements
   * @returns {array} array of <Row> elements for sticky column
   */
  getStickyColumn(rows) {
    var cells;
    var stickyRows = [];

    rows.forEach(proxy((row, r) => {
      cells = row.props.children;

      stickyRows.push(
        <Row {...row.props} id='' key={r}>
          {cells[0]}
        </Row>
      );
    }, this));

    return stickyRows;
  }

  /**
   * Get the jsx header cells and row by copying
   * children elements
   * @param {array} rows provided child row elements
   * @returns {jsx} <Row> of <Cell> elements for sticky header
   */
  getStickyHeader(rows) {
    var row = rows[0];
    var cells = [];

    row.props.children.forEach((cell, c) => {
      cells.push(React.cloneElement(cell, {id: 'sticky-header-cell-' + c, key: c}));
    });

    return (
      <Row {...row.props} id='sticky-header-row'>
        {cells}
      </Row>
    );
  }

  /**
   * Fill for browsers that don't support getComputedStyle (*cough* I.E.)
   * @param  {object} node dom object
   * @return {object} style object
   */
  getStyle(node) {
    var browserSupportsComputedStyle = typeof getComputedStyle !== 'undefined';

    return browserSupportsComputedStyle ? getComputedStyle(node, null) : node.currentStyle;
  }

  /**
   * Get innerWidth and innerHeight of elements
   * @param  {object} node dom object
   * @return {object} dimensions
   */
  getSizeWithoutBoxSizing(node) {
    var nodeStyle = this.getStyle(node);
    var width = node.clientWidth
      - parseFloat(nodeStyle.paddingLeft)
      - parseFloat(nodeStyle.paddingRight);

    var height = node.clientHeight
      - parseFloat(nodeStyle.paddingTop)
      - parseFloat(nodeStyle.paddingBottom);

    return {width, height};
  }

  /**
   * Get the column and header to render
   * @returns {null} no return necessary
   */
  render() {
    var rows = React.Children.toArray(this.props.children);
    var stickyColumn, stickyHeader;

    this.rowCount = rows.length;
    this.columnCount = (rows[0] && rows[0].props.children.length) || 0;

    if (rows.length) {
      if (this.stickyColumnCount > 0) {
        stickyColumn = this.getStickyColumn(rows);
      }
      if (this.stickyHeaderCount > 0) {
        stickyHeader = this.getStickyHeader(rows);
      }
    }

    return (
      <div className={'sticky-table ' + (this.props.className || '')} id={'sticky-table-' + this.id}>
        <div id='x-scrollbar'><div></div></div>
        <div id='y-scrollbar'><div></div></div>
        <div className='sticky-header' id='sticky-header'>
          <Table>{stickyHeader}</Table>
        </div>
        <div className='sticky-table-y-wrapper' id='sticky-table-y-wrapper'>
          <div className='sticky-column' id='sticky-column'>
            <Table>{stickyColumn}</Table>
          </div>
          <div className='sticky-table-x-wrapper' id='sticky-table-x-wrapper'>
            <Table>{rows}</Table>
          </div>
        </div>
      </div>
    );
  }
}

StickyTable.propTypes = {
  rowCount: PropTypes.number, //Including header
  columnCount: PropTypes.number
};

export {StickyTable, Table, Row, Cell};
