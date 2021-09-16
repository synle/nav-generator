import React, { useState, useEffect, useRef, useCallback } from 'https://cdn.skypack.dev/react';
import ReactDOM from 'https://cdn.skypack.dev/react-dom';

const isRenderedInDataUrl = location.href.indexOf('data:') === 0;

const APP_BASE_URL =
  isRenderedInDataUrl || window.hasCustomNavBeforeLoad
    ? 'https://synle.github.io/nav-generator'
    : location.href.substr(0, location.href.lastIndexOf('/')); // this is the base url
const APP_INDEX_URL = `${APP_BASE_URL}/index.html`;
const NEW_NAV_URL = `${APP_INDEX_URL}?newNav`;

// custom events
window.copyToClipboard = async (text) => {
  text = text || '';
  if (text) {
    try {
      await navigator.clipboard.writeText(text);
      await alert('Copied to clipboard!', true);
    } catch (err) {
      await prompt('Clipboard', text, false);
    }
  }
};
document.addEventListener('AppCopyTextToClipboard', (e) => window.copyToClipboard(e.text));

// prompts and alert overrides
(async () => {
  let timeoutRemoveAlertDiv;
  let timeoutRemovePromptDiv;

  window.prompt = (promptText, promptInput, autoDismiss) => {
    clearTimeout(timeoutRemovePromptDiv);

    return new Promise((resolve) => {
      promptInput = promptInput || '';

      document.body.insertAdjacentHTML(
        'beforeend',
        `
        <div id='promptModal' class='modal'>
          <div class='modalBody'>${promptText}</div>
          <textarea id='promptInput'></textarea>
        </div>
      `,
      );

      _setupPrompt();

      function _setupPrompt() {
        const rowCount = promptInput
          .trim()
          .split('\n')
          .reduce((totalCount, s) => {
            totalCount += Math.max(Math.floor(s.length / 75), 1);
            return totalCount;
          }, 1);

        const promtInputElem = document.querySelector('#promptModal #promptInput');
        promtInputElem.value = promptInput;
        promtInputElem.focus();
        promtInputElem.setSelectionRange(0, promptInput.length);
        promtInputElem.rows = Math.min(Math.max(rowCount, 5), 15);
        promtInputElem.onblur = _removePrompt;

        if (autoDismiss) {
          timeoutRemovePromptDiv = setTimeout(_removePrompt, 1300);
        }
      }

      function _removePrompt() {
        clearTimeout(timeoutRemovePromptDiv);

        document.querySelector('#promptModal').style.opacity = '0.05';
        document.querySelector('#promptModal').addEventListener('transitionend', () => {
          try {
            document.querySelector('#promptModal').remove();
          } catch (err) {}
        });

        resolve();
      }
    });
  };

  window.alert = (alertText, manualDismiss) => _showAlertPopup(alertText, false, manualDismiss);
  window.confirm = (alertText, manualDismiss) => _showAlertPopup(alertText, true, true);

  function _showAlertPopup(alertText, isConfirm, manualDismiss) {
    clearTimeout(timeoutRemoveAlertDiv);

    return new Promise((resolve, reject) => {
      if (isConfirm) {
        document.body.insertAdjacentHTML(
          'beforeend',
          `
        <div id='confirmModal' class='modal'>
          <div class='modalBody'>
            ${alertText}
            <footer>
              <button type='button' class='yes'>Yes</button>
              <button type='button' class='no'>No</button>
            </footer>
          </div>
        </div>
      `,
        );
      } else {
        if (manualDismiss !== false) {
          document.body.insertAdjacentHTML(
            'beforeend',
            `
          <div id='alertModal' class='modal'>
            <div class='modalBody'>
              ${alertText}
            </div>
          </div>
        `,
          );
        } else {
          document.body.insertAdjacentHTML(
            'beforeend',
            `
          <div id='alertModal' class='modal'>
            <div class='modalBody'>
              ${alertText}
              <footer>
                <button type='button' class='no'>OK</button>
              </footer>
            </div>
          </div>
        `,
          );
        }
      }

      const alertModalElem = document.querySelector('#alertModal,#confirmModal');

      _setupAlert();

      function _setupAlert() {
        if (isConfirm) {
          alertModalElem.querySelector('.yes').addEventListener('click', () => {
            resolve();
            _removeAlert();
          });
          alertModalElem.querySelector('.no').addEventListener('click', () => {
            reject();
            _removeAlert();
          });
          alertModalElem.querySelector('.yes').focus();
        } else {
          if (manualDismiss !== false) {
            timeoutRemoveAlertDiv = setTimeout(_removeAlert, 1300);
          } else {
            alertModalElem.querySelector('.no').addEventListener('click', () => {
              resolve();
              _removeAlert();
            });

            alertModalElem.querySelector('.no').focus();
          }
        }
      }

      function _removeAlert() {
        clearTimeout(timeoutRemoveAlertDiv);

        alertModalElem.style.opacity = '0.05';
        alertModalElem.addEventListener('transitionend', () => {
          try {
            alertModalElem.remove();
          } catch (err) {}
        });

        resolve();
      }
    });
  }
})();

// component rendering code starts here
(async () => {
  const SAME_TAB_LINK_SPLIT = '|';
  const NEW_TAB_LINK_SPLIT = '|||';
  const HEADER_SPLIT = '#';
  const TITLE_SPLIT = '!';
  const CODE_BLOCK_SPLIT = '```';
  const HTML_BLOCK_SPLIT = '---';
  const TAB_SPLIT = '>>>';
  const TAB_TITLE_SPLIT = '|';
  const FAV_ICON_SPLIT = '@';

  let cacheId = parseInt(Date.now());

  const DEFAULT_SCHEMA_TO_RENDER = `
    ! Navigation ${new Date().toLocaleString()}

    # Main Link Section
    google finance | finance.google.com

    # Secondary Section
    sample alert js | javascript://alert('hello')
    sample data url | data:text/html,%3Chtml%3E%0A%20%20%3Chead%3E%0A%20%20%20%20%3Cmeta%20charset%3D'utf-8'%20%2F%3E%0A%20%20%20%20%3Ctitle%3ELoading...%3C%2Ftitle%3E%0A%20%20%20%20%3Clink%20rel%3D%22stylesheet%22%20href%3D%22http%3A%2F%2Flocalhost%3A8080%2Findex.css%22%20%2F%3E%0A%20%20%3C%2Fhead%3E%0A%20%20%3Cload%20%2F%3E%0A%20%20%3Cscript%20type%3D'schema'%3E!%20Data%20Test%20Navigation%0A%0A%23%20Main%20Section%0Agoogle%7Cgoogle.com%3C%2Fscript%3E%0A%20%20%3Cscript%20src%3D'https%3A%2F%2Funpkg.com%2F%40babel%2Fstandalone%2Fbabel.min.js'%3E%3C%2Fscript%3E%0A%20%20%3Cscript%20src%3D'http%3A%2F%2Flocalhost%3A8080%2Findex.jsx'%20type%3D'text%2Fbabel'%20data-presets%3D'react'%20data-type%3D'module'%3E%3C%2Fscript%3E%0A%3C%2Fhtml%3E

    # Notes
    \`\`\`
    TODO 1
    TODO 2
    \`\`\`

    # Tabs
    >>>tabName1|blockId1>>>tabName2|blockId2

    \`\`\`blockId1
    sample blockId1
    \`\`\`

    ---blockId2
    <u><b>sample html</b></u> blockId2
    ---
  `
    .split('\n')
    .map((s) => s.trim())
    .join('\n');

  // private methods
  async function _navigateToDataUrl(base64URL, forceOpenWindow) {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(decodeURIComponent(base64URL.replace('data:text/html,', '')), 'text/html');
      const schema = doc.querySelector('[type=schema]').innerText.trim();
      const childWindow = window.open(`${APP_INDEX_URL}?loadNav`);

      // post message to redirect the data url accordingly
      const intervalTryPostingMessage = setInterval(_doPostMessage, 100);
      setTimeout(() => clearInterval(intervalTryPostingMessage), 5000);

      function _doPostMessage() {
        childWindow.postMessage({ type: 'onViewLinks', schema }, '*');
      }
    } catch (err) {
      // show it in the prompt
      await prompt('Data URL (Copy to clipboard):', base64URL);
    }
  }

  function _getNavBookmarkletFromSchema(input) {
    input = input.trim();

    let rawOutput = `
<html>
  <head>
    <meta charset='utf-8' />
    <title>Loading...</title>
    <link rel="stylesheet" href="${APP_BASE_URL}/index.css" />
  </head>
  <load />
  <js_script type='schema'>${input}</js_script>
  <js_script src='https://unpkg.com/@babel/standalone/babel.min.js'></js_script>
  <js_script src='${APP_BASE_URL}/index.jsx' type='text/babel' data-presets='react' data-type='module'></js_script>
</html>
    `
      .trim()
      .replace(/js_script/g, 'script');

    return 'data:text/html,' + encodeURIComponent(rawOutput);
  }

  function _dispatchEvent(target, evName, evExtra = {}) {
    // trigger first tab selection
    const evType = 'MouseEvents';
    var evObj = document.createEvent(evType);
    evObj.initEvent(evName, true, false);

    for (const extraKey of Object.keys(evExtra)) {
      evObj[extraKey] = evExtra[extraKey];
    }

    target.dispatchEvent(evObj);
  }

  function _dispatchCustomEvent(target, evName, evExtra = {}) {
    // trigger first tab selection
    var evObj = new Event(evName);

    for (const extraKey of Object.keys(evExtra)) {
      evObj[extraKey] = evExtra[extraKey];
    }

    target.dispatchEvent(evObj);
  }

  function _getUrlDownloadSchema(schema) {
    return `data:text/plain,${encodeURIComponent(schema)}`;
  }

  function _setSessionValue(key, value) {
    try {
      sessionStorage[key] = value;
    } catch (err) {}
  }

  function _getSessionValue(key) {
    try {
      return sessionStorage[key] || '';
    } catch (err) {
      return '';
    }
  }

  function _setLocalValue(key, value) {
    try {
      localStorage[key] = value;
    } catch (err) {}
  }

  function _getLocalValue(key) {
    try {
      return localStorage[key] || '';
    } catch (err) {
      return '';
    }
  }

  function _persistBufferSchema(value) {
    _setSessionValue('schemaData', value);
  }

  function _getPersistedBufferSchema() {
    return _getSessionValue('schemaData');
  }

  function _onCopyToClipboard(text) {
    _dispatchCustomEvent(document, 'AppCopyTextToClipboard', { text });
  }

  function _addScript(src) {
    return new Promise(async (resolve) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      document.head.appendChild(script);
    });
  }

  function _addStyle(src, rel = 'stylesheet/less') {
    return new Promise(async (resolve) => {
      const link = document.createElement('link');
      link.rel = rel;
      link.href = src;
      document.head.appendChild(link);
      resolve();
    });
  }

  function _schemaSectionNameOnlySorter(a, b) {
    const fa = a[0].toLowerCase();
    const fb = b[0].toLowerCase();

    if (fa > fb) {
      return 1;
    }

    if (fa < fb) {
      return -1;
    }

    return 0;
  }

  function _getSerializedSchema(schema) {
    // parse lines and generate views
    const lines = schema
      .trim()
      .split('\n')
      .filter((r) => r.indexOf('//') !== 0)
      .map((r) => r.trimEnd());

    if (lines[0][0] !== '!') {
      const headerSchemaSampleCode = `${TITLE_SPLIT} Unnamed Navigation - ${new Date().toLocaleString()}`;
      lines.unshift(headerSchemaSampleCode);
    }

    let blockBuffer = [];
    let isInABlock = false;
    let blockType = ''; // code or html
    let currentHeaderName = '';
    let blockId = '';
    let pageFavIcon = '📑';

    let blockIdMap = {};

    const serializedSchema = [];

    const _upsertBlockId = (blockId) => {
      if (!blockId) {
        return `block_${++cacheId}_generated`;
      }

      if (!blockIdMap[blockId]) {
        blockIdMap[blockId] = `block_${++cacheId}_${blockId}`;
      }

      return blockIdMap[blockId];
    };

    lines.forEach((link) => {
      const newCacheId = ++cacheId;

      // other processing for non block
      if (isInABlock) {
        if (blockType === 'code' && link.trim() === CODE_BLOCK_SPLIT) {
          // end of a code block
          serializedSchema.push({
            key: newCacheId,
            id: _upsertBlockId(blockId),
            value: blockBuffer.join('\n'),
            type: 'code_block',
          });
          isInABlock = false;
          blockBuffer = [];
          blockType = '';
          currentHeaderName = ''; // reset the header name
          blockId = '';
        } else if (blockType === 'html' && link.trim() === HTML_BLOCK_SPLIT) {
          // end of a html block
          serializedSchema.push({
            key: newCacheId,
            id: _upsertBlockId(blockId),
            value: blockBuffer.join('\n'),
            type: 'html_block',
          });
          isInABlock = false;
          blockBuffer = [];
          blockType = '';
          currentHeaderName = ''; // reset the header name
          blockId = '';
        } else {
          blockBuffer.push(link);
        }
        return;
      }

      // other processing for non block
      if (link.trim().indexOf(FAV_ICON_SPLIT) === 0) {
        pageFavIcon = link.replace(/^[@]+/, '').trim();
        serializedSchema.push({
          key: newCacheId,
          value: pageFavIcon,
          type: 'favIcon',
        });
      } else if (link.trim().indexOf(TITLE_SPLIT) === 0) {
        // page title
        const headerText = link.replace(TITLE_SPLIT, '').trim();
        serializedSchema.push({
          key: newCacheId,
          value: headerText,
          type: 'title',
        });
      } else if (link.trim().indexOf(HEADER_SPLIT) === 0) {
        // section header
        const headerText = link.replace(HEADER_SPLIT, '').trim();
        serializedSchema.push({
          key: newCacheId,
          value: headerText,
          type: 'header',
        });

        currentHeaderName = headerText;
      } else if (link.trim().indexOf(CODE_BLOCK_SPLIT) === 0) {
        // start a block
        isInABlock = true;
        blockType = 'code';
        if (link.length > CODE_BLOCK_SPLIT.length) {
          blockId = link.substr(blockId.indexOf(CODE_BLOCK_SPLIT) + CODE_BLOCK_SPLIT.length + 1);
          _upsertBlockId(blockId);
        }
      } else if (link.trim().indexOf(HTML_BLOCK_SPLIT) === 0) {
        // start a block
        isInABlock = true;
        blockType = 'html';
        if (link.length > HTML_BLOCK_SPLIT.length) {
          blockId = link.substr(blockId.indexOf(HTML_BLOCK_SPLIT) + HTML_BLOCK_SPLIT.length + 1);
          _upsertBlockId(blockId);
        }
      } else if (link.trim().indexOf(TAB_SPLIT) === 0) {
        // is a tab >>>tabName1|blockId1>>>tabName2|blockId2
        let tabContent = [];
        let isFirstTab = true;
        link
          .split(TAB_SPLIT)
          .map((r) => r.trim())
          .filter((r) => !!r)
          .forEach((t) => {
            const [tabName, tabId] = t.split(TAB_TITLE_SPLIT);
            if (tabName && tabId) {
              tabContent.push({
                tabId: _upsertBlockId(tabId),
                tabName,
              });
            }
          });

        serializedSchema.push({
          key: newCacheId,
          type: 'tabs',
          tabContent: tabContent,
        });
      } else if (link.trim().length > 0) {
        // anything else is a link
        let linkType;
        let linkText, linkUrl;

        try {
          // try parse as new tab link
          if (
            link.indexOf(NEW_TAB_LINK_SPLIT) !== -1 &&
            link.indexOf(NEW_TAB_LINK_SPLIT) <= link.indexOf(SAME_TAB_LINK_SPLIT)
          ) {
            linkText = link.substr(0, link.indexOf(NEW_TAB_LINK_SPLIT)).trim();
            linkUrl = link.substr(link.indexOf(NEW_TAB_LINK_SPLIT) + NEW_TAB_LINK_SPLIT.length).trim();
            linkType = 'newTabLink';
          }
        } catch (err) {}

        if (!linkType) {
          // try parse as same tab link
          try {
            if (link.length > 0 && SAME_TAB_LINK_SPLIT.includes(SAME_TAB_LINK_SPLIT)) {
              linkText = link.substr(0, link.indexOf(SAME_TAB_LINK_SPLIT)).trim();
              linkUrl = link.substr(link.indexOf(SAME_TAB_LINK_SPLIT) + SAME_TAB_LINK_SPLIT.length).trim();
              linkType = 'sameTabLink';
            }
          } catch (err) {}
        }

        // if found a link type...
        if (linkType) {
          if (linkUrl.indexOf('/') === 0) {
            // prepend https:// for absolute links
            // associated with domains
            linkUrl = `${location.origin}${linkUrl}`;
          } else if (
            linkUrl.indexOf('http://') !== 0 &&
            linkUrl.indexOf('https://') !== 0 &&
            linkUrl.indexOf('javascript://') !== 0 &&
            linkUrl.indexOf('data:') !== 0
          ) {
            // prepend the link url https://
            // for link without anything prefix
            linkUrl = `https://${linkUrl}`;
          }

          if (linkUrl.indexOf('javascript://') === 0) {
            // js func link
            linkType = 'jsLink';
          } else if (linkUrl.indexOf('data:') === 0) {
            linkType = 'dataLink';
          }

          serializedSchema.push({
            key: newCacheId,
            type: 'link',
            linkUrl,
            linkText,
            linkType,
            headerName: currentHeaderName,
          });
        }
      }
    });

    return serializedSchema;
  }

  // react components
  function SearchBox(props) {
    const { onSearch } = props;

    return (
      <input
        id='search'
        list='autocompleteSearches'
        onInput={(e) => onSearch(e.target.value)}
        placeholder='🔍 Search for bookmark'
        autocomplete='off'
        spellcheck='false'
        autoFocus
        required
      />
    );
  }

  function NavReadContainer(props) {
    const { schema, onSetViewMode, onSetSchema } = props;
    const [searchText, setSearchText] = useState('');
    const refContainer = useRef();

    // events
    const onEdit = useCallback(() => {
      onSetViewMode('edit');
    }, []);

    const onSearch = useCallback((newSearchText) => {
      setSearchText(newSearchText);
    }, []);

    const onSubmitNavigationSearch = useCallback((e) => {
      e.preventDefault();

      if (refContainer && refContainer.current) {
        const doc = refContainer.current;

        const links = [...doc.querySelectorAll('.link:not(.hidden)')];

        // focus on the first link
        if (links.length > 0) {
          links[0].focus();
        }

        // only 1 result, then let's redirect
        if (links.length === 1 && links[0].href) {
          location.href = links[0].href;
        }
      }

      return false;
    }, []);

    // handling search
    useEffect(() => {
      if (refContainer && refContainer.current) {
        const doc = refContainer.current;

        if (searchText.length === 0) {
          for (const elem of doc.querySelectorAll('.link')) {
            elem.classList.remove('hidden');
          }
          return;
        }

        // remove all non alphanumeric
        let exactMatchregex = new RegExp(searchText.replace(/"/g, ''), 'i');
        let matchRegex = exactMatchregex;
        if (searchText[0] === '/') {
          // fuzzy match
          const cleanedSearchText = searchText
            .replace(/[\W_]+/gi, ' ')
            .replace(/[ ][ ]+/, ' ')
            .trim();

          matchRegex = new RegExp('[ ]*' + cleanedSearchText.split('').join('[a-z0-9 -_]*'), 'i');
        }

        // show or hide
        for (const elem of doc.querySelectorAll('.link')) {
          let isHidden = true;

          const link = (elem.href || '')
            .replace(/http[s]/gi, '')
            .replace(/www/gi, '')
            .replace(/html/gi, '')
            .replace(/index/gi, '')
            .replace(/[/.]/gi, '');

          const text = elem.innerText || '';

          if (text.match(matchRegex)) {
            isHidden = false;
          } else if (elem.dataset.section && elem.dataset.section.match(exactMatchregex)) {
            isHidden = false;
          } else if (link.match(exactMatchregex)) {
            isHidden = false;
          }

          elem.classList.toggle('hidden', isHidden);
        }
      }
    }, [searchText, refContainer.current]);

    return (
      <div id='fav' ref={refContainer}>
        <SchemaRender schema={schema} refContainer={refContainer} />
        <form id='searchForm' onSubmit={(e) => onSubmitNavigationSearch(e)}>
          <SearchBox onSearch={onSearch} />
        </form>
        <div className='commands'>
          <button id='edit' onClick={onEdit}>
            Edit
          </button>
          <DropdownButtons type='pullUp'>
            {/*dropdown trigger*/}
            <button className='dropdown-trigger'>Copy</button>
            {/*dropdown buttons*/}
            <button
              className='copyBookmarkToClipboard'
              onClick={() => _onCopyToClipboard(_getNavBookmarkletFromSchema(schema))}>
              To Bookmark
            </button>
            <button onClick={() => _onCopyToClipboard(schema)}>To Schema</button>
          </DropdownButtons>
          <a target='_blank' href={NEW_NAV_URL}>
            New Nav
          </a>
        </div>
      </div>
    );
  }

  function NavEditContainer(props) {
    const { schema, onSetViewMode, onSetSchema } = props;
    const [bufferSchema, setBufferSchema] = useState(schema.trim());
    const [hasPendingChanges, setHasPendingChanges] = useState(false);
    const [bookmark, setBookmark] = useState('');

    const urlDownloadSchema = _getUrlDownloadSchema(schema);

    // events
    const onApply = useCallback(() => {
      onSetSchema(bufferSchema); // update schema
      onSetViewMode('read');

      //update the cache in the session storage
      _persistBufferSchema(bufferSchema); // commit the changes
    }, []);

    const onCancel = useCallback(async () => {
      if (hasPendingChanges) {
        try {
          await confirm('You have unsaved changes. Discard unsaved changes?');
        } catch (err) {
          // user cancel, then stop...
          return;
        }
      }

      onSetViewMode('read');
    }, []);

    const onTest = useCallback(() => {
      const base64URL = _getNavBookmarkletFromSchema(schema);
      _navigateToDataUrl(base64URL, true);
    }, []);

    const onSetBufferSchema = useCallback((newBufferSchema) => {
      setBufferSchema(newBufferSchema);
      setHasPendingChanges(true);
    }, []);

    function onSortSchemaBySectionNameAndTitle(schema) {
      const rows = schema.split('\n');
      let sections = [];
      let sectionIdx = 0;

      for (const row of rows) {
        if (row[0] === '#') {
          sectionIdx++;
        }
        sections[sectionIdx] = sections[sectionIdx] || [];
        sections[sectionIdx].push(row);
      }

      sections = sections
        .filter((s) => !!s && s.length > 0)
        .map((s) => {
          if (s[s.length - 1] !== '') {
            s.push('');
          }
          return s;
        })
        .sort(_schemaSectionNameOnlySorter);

      const newBufferSchema = sections.map((s) => s.join('\n')).join('\n');
      setBufferSchema(newBufferSchema);
    }

    // effects
    useEffect(() => {
      // store it into cache
      _persistBufferSchema(schema);

      // hook up the tab and shift tab to do modification
      return () => {
        window.onbeforeunload = undefined;
      };
    }, []);

    // trigger the confirmation to save before unload
    useEffect(() => {
      if (hasPendingChanges) {
        window.onbeforeunload = function (e) {
          e.preventDefault();
          return (e.returnValue = 'You have unsaved changes. Do you want to continue with exit?');
        };
      }
    }, [hasPendingChanges]);

    // update bookmarklet
    useEffect(() => {
      setBookmark(_getNavBookmarkletFromSchema(bufferSchema));
    }, [bufferSchema]);

    // generate the view
    return (
      <div id='command'>
        <div className='title'>Edit Navigation</div>
        <div className='commands'>
          <button id='applyEdit' type='button' onClick={() => onApply()}>
            Apply
          </button>
          <button id='cancelEdit' type='button' onClick={() => onCancel()}>
            Cancel
          </button>
          <DropdownButtons>
            {/*dropdown trigger*/}
            <a className='dropdown-trigger' tabIndex='0'>
              Actions
            </a>
            {/*dropdown buttons*/}
            <a target='_blank' href={NEW_NAV_URL}>
              New Nav
            </a>
            <button onClick={() => onSortSchemaBySectionNameAndTitle(bufferSchema)}>Sort Schema</button>
            <button className='copyBookmarkToClipboard' onClick={() => _onCopyToClipboard(bookmark)}>
              Copy Bookmark
            </button>
            <button onClick={() => _onCopyToClipboard(bufferSchema)}>Copy Schema</button>
            <a target='_blank' href='https://github.com/synle/nav-generator/blob/main/index.jsx'>
              JS Code
            </a>
            <a target='_blank' href='https://github.com/synle/nav-generator/blob/main/index.less'>
              CSS Code
            </a>
            <button type='button' onClick={onTest}>
              Test
            </button>
            <a href={urlDownloadSchema} download={`schema.${new Date().getTime()}.txt`}>
              Download Schema
            </a>
            <a href={bookmark} download={`bookmark.${new Date().getTime()}.html`}>
              Download Bookmark
            </a>
          </DropdownButtons>
        </div>
        <SchemaEditor
          id='input'
          wrap='soft'
          spellcheck='false'
          autoFocus
          value={bufferSchema}
          onInput={(e) => onSetBufferSchema(e.target.value)}
          onBlur={(e) => onSetBufferSchema(e.target.value)}></SchemaEditor>
      </div>
    );
  }

  function SchemaRender(props) {
    const { schema, refContainer } = props;

    const [autocompleteSearches, setAutocompleteSearches] = useState([]);
    const [doms, setDoms] = useState(null);

    // handling tabs
    useEffect(() => {
      if (refContainer && refContainer.current) {
        const doc = refContainer.current;

        const tabsList = [...doc.querySelectorAll('tabs')];

        for (const tabs of tabsList) {
          const tabChildren = [...tabs.querySelectorAll('tab')];

          // trigger first tab selection
          _dispatchEvent(tabChildren[0], 'click');
        }
      }
    }, [doms, refContainer.current]);

    // generate the view dom
    useEffect(() => {
      const newAutocompleteSearches = new Set();
      const serializedSchema = _getSerializedSchema(schema);

      const newDoms = serializedSchema.map((schemaComponent) => {
        switch (schemaComponent.type) {
          case 'title':
            // set the page title
            document.title = schemaComponent.value;

            return (
              <div id={schemaComponent.id} key={schemaComponent.key} className='title'>
                {schemaComponent.value}
              </div>
            );
            break;
          case 'favIcon':
            // insert the fav icon
            const pageFavIcon = schemaComponent.value;
            document.querySelector('#pageFavIcon') && document.querySelector('#pageFavIcon').remove();
            const favIconEncoded =
              encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'><text x='0' y='14'>`) +
              pageFavIcon +
              encodeURIComponent(`</text></svg>`);
            document.head.insertAdjacentHTML(
              'beforeend',
              `<link id='pageFavIcon' data-fav-icon="${pageFavIcon}" rel="icon" href="data:image/svg+xml,${favIconEncoded}" />`,
            );
            break;
          case 'header':
            return (
              <div id={schemaComponent.id} key={schemaComponent.key} className='header'>
                {schemaComponent.value}
              </div>
            );
          case 'code_block':
            return (
              <pre
                id={schemaComponent.id}
                key={schemaComponent.key}
                className='block codeBlock'
                onDoubleClick={(e) => _onCopyToClipboard(e.target.innerText.trim())}>
                {schemaComponent.value}
              </pre>
            );
          case 'html_block':
            return (
              <div
                id={schemaComponent.id}
                key={schemaComponent.key}
                className='block htmlBlock'
                dangerouslySetInnerHTML={{ __html: schemaComponent.value }}></div>
            );
          case 'tabs':
            const tabContent = [];
            for (const tab of schemaComponent.tabContent) {
              tabContent.push(
                <tab className='tab' tabIndex='0' data-tab-id={tab.tabId}>
                  {tab.tabName}
                </tab>,
              );
            }
            return (
              <tabs id={schemaComponent.id} key={schemaComponent.key} className='tabs'>
                {tabContent}
              </tabs>
            );
          case 'link':
            newAutocompleteSearches.add(schemaComponent.linkText);

            switch (schemaComponent.linkType) {
              case 'newTabLink':
                return (
                  <a
                    id={schemaComponent.id}
                    key={schemaComponent.key}
                    className='link newTabLink'
                    target='_blank'
                    href={schemaComponent.linkUrl}
                    data-section={schemaComponent.headerName}>
                    {schemaComponent.linkText}
                  </a>
                );
              case 'sameTabLink':
                return (
                  <a
                    id={schemaComponent.id}
                    key={schemaComponent.key}
                    className='link sameTabLink'
                    href={schemaComponent.linkUrl}
                    data-section={schemaComponent.headerName}>
                    {schemaComponent.linkText}
                  </a>
                );
              case 'jsLink':
                return (
                  <button
                    id={schemaComponent.id}
                    key={schemaComponent.key}
                    className='link jsLink'
                    type='button'
                    onClick={() => eval(schemaComponent.linkUrl)}
                    data-section={schemaComponent.headerName}>
                    {schemaComponent.linkText}
                  </button>
                );
              case 'dataLink':
                return (
                  <button
                    id={schemaComponent.id}
                    key={schemaComponent.key}
                    className='link dataLink'
                    type='button'
                    onClick={() => _navigateToDataUrl(schemaComponent.linkUrl)}
                    data-section={schemaComponent.headerName}>
                    {schemaComponent.linkText}
                  </button>
                );
            }
            break;
        }
      });

      // update the doms
      setDoms(newDoms);
      setAutocompleteSearches([...newAutocompleteSearches]);
    }, [schema]);

    return (
      <>
        {doms}
        <datalist id='autocompleteSearches'>
          {autocompleteSearches.map((search) => (
            <option key={search}>{search}</option>
          ))}
        </datalist>
      </>
    );
  }

  function SchemaEditor(props) {
    const onInputKeyDown = useCallback((e) => {
      const TAB_INDENT = '  ';
      switch (e.key) {
        case 'Tab':
          e.preventDefault();
          if (e.shiftKey === true) {
            _deleteIndentAtCursor(e.target, TAB_INDENT.length);
          } else {
            _insertIndentAtCursor(e.target, TAB_INDENT);
          }
          break;
        case 'Enter':
          // attempted to persist the last row indentation
          e.preventDefault();
          _persistTabIndent(e.target);
          break;
        case 'Pause':
          e.preventDefault();
          _trimTrailingWhitespaces(e.target);
          break;
        case 'F10':
          e.preventDefault();
          _sortSelectedLines(e.target);
          break;
      }

      function _insertIndentAtCursor(myField, myValue) {
        let startPos = myField.selectionStart;
        let endPos = myField.selectionEnd;

        if (startPos === endPos) {
          // single line indentation
          myField.value = myField.value.substring(0, startPos) + myValue + myField.value.substring(endPos);
          myField.setSelectionRange(startPos + myValue.length, endPos + myValue.length);
        } else {
          // multiple line indentation
          const [lineStart, lineEnd] = _getLineStartEnd(myField, startPos, endPos);

          // calculate where we should put the cursor
          const [res, newStartPos, newEndPos] = _iterateOverRows(
            myField.value.split('\n'),
            lineStart,
            lineEnd,
            (row) => myValue + row,
          );
          myField.value = res;
          myField.setSelectionRange(newStartPos, newEndPos);
        }
      }

      function _deleteIndentAtCursor(myField, length) {
        let startPos = myField.selectionStart;
        let endPos = myField.selectionEnd;

        if (startPos === endPos) {
          myField.value = myField.value.substring(0, startPos - 2) + myField.value.substring(endPos);
          myField.setSelectionRange(startPos - length, endPos - length);
        } else {
          const [lineStart, lineEnd] = _getLineStartEnd(myField, startPos, endPos);

          const [res, newStartPos, newEndPos] = _iterateOverRows(
            myField.value.split('\n'),
            lineStart,
            lineEnd,
            (row) => {
              for (let i = 0; i < row.length; i++) {
                if (row[i] !== ' ' || i === length) {
                  return row.substr(i);
                }
              }
              return row;
            },
          );

          myField.value = res;
          myField.setSelectionRange(newStartPos, newEndPos);
        }
      }

      function _persistTabIndent(myField) {
        try {
          const rows = myField.value.substr(0, myField.selectionStart).split('\n');
          const lastRow = rows[rows.length - 1];
          const lastRowIndent = lastRow.match(/^[ ]+/)[0];

          _insertIndentAtCursor(e.target, '\n' + lastRowIndent);
        } catch (err) {
          _insertIndentAtCursor(e.target, '\n');
        }
      }

      function _trimTrailingWhitespaces(myField) {
        const rows = myField.value.split('\n').map((r) => r.trimEnd());
        myField.value = rows.join('\n');
        myField.setSelectionRange(0, 0);
      }

      function _sortSelectedLines(myField) {
        let startPos = myField.selectionStart;
        let endPos = myField.selectionEnd;
        const [lineStart, lineEnd] = _getLineStartEnd(myField, startPos, endPos);

        const [_res, newStartPos, newEndPos] = _iterateOverRows(myField.value.split('\n'), lineStart, lineEnd);

        let res1 = myField.value.substr(0, newStartPos);
        let res2 = myField.value.substr(newStartPos, newEndPos - newStartPos);
        let res3 = myField.value.substr(newEndPos);

        res2 = sortMiddlePart(res2);
        function sortMiddlePart(schema) {
          const rows = schema.split('\n');
          let sections = [];
          let sectionIdx = 0;

          for (const row of rows) {
            // TODO: there's a bug there that if section name is part of the
            // code block or html block - this will not work
            if (row[0] === HEADER_SPLIT) {
              sectionIdx++;
            }
            sections[sectionIdx] = sections[sectionIdx] || [];
            sections[sectionIdx].push(row);
          }

          sections = sections
            .filter((s) => !!s && s.length > 0)
            .map((s) => {
              if (s[s.length - 1] !== '') {
                s.push('');
              }
              return s;
            })
            .sort(_schemaSectionNameOnlySorter);

          return sections.map((s) => s.join('\n')).join('\n');
        }

        const res = res1 + res2 + res3;

        myField.value = res;
        myField.setSelectionRange(newStartPos, newEndPos);
      }

      function _iterateOverRows(rows, lineStart, lineEnd, func) {
        let newStartPos;
        let newEndPos;
        let curCharCount = 0;

        func =
          func ||
          function (row) {
            return row;
          };

        const res = [];
        for (let i = 0; i < rows.length; i++) {
          let row = rows[i];

          if (i >= lineStart && i <= lineEnd) {
            row = func(row);
          }

          if (i === lineStart) {
            newStartPos = curCharCount;
          }

          if (i === lineEnd) {
            newEndPos = curCharCount + row.length;
          }

          curCharCount += row.length + 1;

          res.push(row);
        }

        return [res.join('\n'), newStartPos, newEndPos];
      }

      function _getLineStartEnd(myField, startPos, endPos) {
        let lineStart = 0,
          lineEnd = 0;
        try {
          lineStart = myField.value.substr(0, startPos).match(/\n/g).length;
        } catch (err) {}

        try {
          lineEnd = myField.value.substr(0, endPos).match(/\n/g).length;
        } catch (err) {}

        return [lineStart, lineEnd];
      }
    }, []);

    return <textarea onKeyDown={(e) => onInputKeyDown(e)} {...props}></textarea>;
  }

  function DropdownButtons(props) {
    const type = props.type || '';
    const [triggerButton, ...buttonsElems] = props.children;
    return (
      <div className='dropdown'>
        {triggerButton}
        <div className={`dropdown-content ${type}`.trim()}>{buttonsElems}</div>
      </div>
    );
  }

  function NavCreateContainer(props) {
    const { schema, onSetViewMode, onSetSchema } = props;
    return <>create {schema}</>;
  }

  // main app starts here
  function App(props) {
    const [viewMode, setViewMode] = useState(props.viewMode); // read, edit, create
    const [schema, setSchema] = useState(props.schema);

    // events
    const onSetViewMode = (newView) => setViewMode(newView);
    const onSetSchema = (newSchema) => setSchema(newSchema);

    // effect
    useEffect(() => {
      switch (viewMode) {
        case 'edit':
          document.title = 'Edit Navigation';
          break;
        case 'create':
          document.title = 'New Navigation';
          break;
      }
    }, [viewMode]);

    // render the proper views
    const allProps = { schema, onSetSchema, onSetViewMode };
    switch (viewMode) {
      case 'read':
        return <NavReadContainer {...allProps} />;
      case 'edit':
        return <NavEditContainer {...allProps} />;
      case 'create':
        return <NavCreateContainer {...allProps} />;
    }
  }

  // initialization
  // hooking up extra meta data
  document.head.insertAdjacentHTML(
    'beforeend',
    `
      <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no" />
      <meta name="format-detection" content="telephone=no" />
      <meta http-equiv="Cache-Control" content="no-cache" />
      <meta http-equiv="Pragma" content="no-cache" />
      <meta http-equiv="page-enter" content="revealtrans(duration=seconds,transition=num)" />
      <meta http-equiv="page-exit" content="revealtrans(duration=seconds,transition=num)" />
    `.trim(),
  );

  // app level events
  document.addEventListener(
    'keydown',
    (e) => {
      // handling enter and spacebar on focusable div
      const { key } = e;
      const target = e.target;
      const focusedElement = document.activeElement;

      if (key === 'Enter' || key === ' ') {
        if (
          parseInt(target.tabIndex) === 0 &&
          target.tagName !== 'TEXTAREA' &&
          target.tagName !== 'INPUT' &&
          target.tagName !== 'SELECT'
        ) {
          _dispatchEvent(target, 'click');

          e.preventDefault();
          e.stopPropagation();
          return;
        }
      } else if (key === 'Escape') {
        if (document.querySelector('#input')) {
          if (document.querySelector('#input') === document.activeElement) {
            document.querySelector('#input').blur();
          }
        }
        if (document.querySelector('#search')) {
          if (document.querySelector('#search') === document.activeElement) {
            document.querySelector('#search').blur();
          }
        }
        if (document.querySelector('#promptModal')) {
          try {
            document.querySelector('#promptModal #promptInput').onblur();
          } catch (err) {}
        }
        if (document.querySelector('#alertModal .modalBody')) {
          try {
            document.querySelector('#alertModal .modalBody').onblur();
          } catch (err) {}
        }
        if (document.querySelector('.modalBody .no')) {
          try {
            _dispatchEvent(document.querySelector('.modalBody .no'), 'click');
          } catch (err) {}
        }
      } else if (
        document.querySelector('#search') &&
        document.querySelector('#search') !== focusedElement &&
        document.querySelectorAll('.modal').length === 0
      ) {
        // special handling to focus on searchbox
        const searchBox = document.querySelector('#search');
        switch (key) {
          case 'f':
          case '?':
          case '/':
          case 't':
            if (!e.ctrlKey && !e.altKey && !e.metaKey) {
              searchBox.focus();
              e.preventDefault();
            }
            break;
          case 'e':
          case 'i':
            _dispatchEvent(document.querySelector('#edit'), 'click');
            e.preventDefault();
            break;
          case 'c':
            if (!e.ctrlKey && !e.altKey && !e.metaKey) {
              _dispatchEvent(document.querySelectorAll('.copyBookmarkToClipboard')[0], 'click');
              e.preventDefault();
            }
            break;
        }
      }
    },
    true,
  );

  // click handling for tab selection
  document.addEventListener(
    'click',
    (e) => {
      const target = e.target;
      if (target.classList.contains('tab')) {
        const tab = target;
        const tabChildren = [...tab.parentElement.querySelectorAll('tab')];

        for (const targetTab of tabChildren) {
          const targetTabId = targetTab.dataset.tabId;
          if (tab === targetTab) {
            document.querySelector(`#${tab.dataset.tabId}`).style.display = 'block';
            tab.classList.add('selected');
          } else {
            document.querySelector(`#${targetTabId}`).style.display = 'none';
            targetTab.classList.remove('selected');
          }
        }
      }
    },
    true,
  );

  document.addEventListener(
    'mousedown',
    (e) => {
      if (e.button == 1) {
        // middle click on button to trigger click
        const target = e.target;
        if (target.tagName === 'BUTTON') {
          _dispatchEvent(target, 'click');
          e.preventDefault();
        }
      }
    },
    true,
  );

  // add extra scripts if it's not there already
  await Promise.all([
    // debug
    // _addStyle(isRenderedInDataUrl ? `${APP_BASE_URL}/index.less` : 'index.less'),
    // _addScript('https://cdnjs.cloudflare.com/ajax/libs/less.js/4.1.1/less.min.js'),
  ]);

  // find and parse the schema from script
  let inputSchema = _getPersistedBufferSchema() || '';
  let viewMode = 'read';

  document.innerHTML = `<div style="text-align: center; margin: 20px; font-size: 20px;">Loading...</div>`;

  if (!window.hasCustomNavBeforeLoad) {
    if (location.search.includes('loadNav')) {
      // will wait for postmessage to populate this
      window.history.pushState('', '', APP_INDEX_URL);
      _setSessionValue('loadNavFromSessionStorage', '1');

      const _onHandlePostMessageEvent = (event) => {
        const { type } = event.data;
        const newSchema = event.data.schema;
        if (type === 'onViewLinks') {
          try {
            _persistBufferSchema(newSchema);
            inputSchema = newSchema;
            _render(); // rerender the dom
          } catch (err) {}
        }
      };
      window.addEventListener('message', _onHandlePostMessageEvent);
    } else if (location.search.includes('newNav') || (!isRenderedInDataUrl && !location.href.includes('index.html'))) {
      // render as edit mode for newNav
      window.history.replaceState('', '', APP_INDEX_URL);
      _persistBufferSchema(DEFAULT_SCHEMA_TO_RENDER);
      _setSessionValue('loadNavFromSessionStorage', '1');

      inputSchema = DEFAULT_SCHEMA_TO_RENDER;
      viewMode = 'edit';

      _render(); // rerender the dom
    } else if (_getSessionValue('loadNavFromSessionStorage') === '1' && location.href.includes(APP_INDEX_URL)) {
      // if this flag is set, then continue
      // will proceed with loading from session storage
      _render(); // rerender the dom
    } else if (document.querySelector('[type=schema]')) {
      // use the schema script instead here...
      try {
        inputSchema = document.querySelector('[type=schema]').innerText.trim();
      } catch (err) {}

      _render(); // rerender the dom
    }
  } else {
    // else if no schema script or anything other way then we need
    // to listen to the app
    _dispatchCustomEvent(document, 'NavBeforeLoad', {
      renderSchema: (newSchema) => {
        inputSchema = newSchema;

        _render(); // rerender the dom
      },
    });
  }

  function _render() {
    ReactDOM.render(<App schema={inputSchema} viewMode={viewMode} />, document.body);
  }
})();
