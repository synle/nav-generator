import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import Editor, { loader } from "@monaco-editor/react";
import styles from "./index.scss?inline";

// Inject styles inline into the document head
const styleEl = document.createElement("style");
styleEl.textContent = styles;
document.head.appendChild(styleEl);

// Set global flag if script URL has ?hasCustomNavBeforeLoad=1
const params = new URLSearchParams(document.currentScript?.src.split("?")[1]);
window.hasCustomNavBeforeLoad = params.get("hasCustomNavBeforeLoad") === "1";

const isRenderedInDataUrl = location.href.indexOf("data:") === 0;

const APP_UPSTREAM_DEFAULT_BASE_URL = "https://synle.github.io/nav-generator";
const APP_BASE_URL =
  isRenderedInDataUrl || window.hasCustomNavBeforeLoad
    ? APP_UPSTREAM_DEFAULT_BASE_URL
    : location.href.substr(0, location.href.lastIndexOf("/")); // this is the base url
const APP_INDEX_URL = `${APP_BASE_URL}/index.html`;
const NEW_NAV_URL = `${APP_INDEX_URL}?newNav`;

// custom events
window.copyToClipboard = async (text) => {
  text = (text || "").trim();
  if (text) {
    try {
      await navigator.clipboard.writeText(text);
      await alert("Copied to clipboard!");
    } catch (err) {
      await prompt("Clipboard", text);
    }
  }
};
document.addEventListener("AppCopyTextToClipboard", (e) => window.copyToClipboard(e.text));

// Modal component for alerts, prompts, and confirms
function Modal(props) {
  const { isOpen, onClose, children } = props;
  const modalRef = useRef(null);

  useLayoutEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    const handleClickOutside = (e) => {
      if (modalRef.current && e.target === modalRef.current) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div className="modal" ref={modalRef}>
      <div className="modalContent">{children}</div>
    </div>,
    document.body,
  );
}

function AlertModal(props) {
  const { message, onClose, type = "alert" } = props;
  const primaryButtonRef = useRef(null);

  useLayoutEffect(() => {
    if (primaryButtonRef.current) {
      primaryButtonRef.current.focus();
    }
  }, []);

  if (type === "confirm") {
    return (
      <Modal isOpen={true} onClose={() => onClose(false)}>
        <div className="modalBody">
          <div className="modalMessage">{message}</div>
          <footer className="modalFooter">
            <button ref={primaryButtonRef} type="button" className="modalBtn primary" onClick={() => onClose(true)}>
              Yes
            </button>
            <button type="button" className="modalBtn modalBtnSecondary" onClick={() => onClose(false)}>
              No
            </button>
          </footer>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={true} onClose={() => onClose()}>
      <div className="modalBody">
        <div className="modalMessage">{message}</div>
        <footer className="modalFooter">
          <button ref={primaryButtonRef} type="button" className="modalBtn primary" onClick={() => onClose()}>
            OK
          </button>
        </footer>
      </div>
    </Modal>
  );
}

function PromptModal(props) {
  const { message, initialValue = "", onClose, hasCallback = false } = props;
  const [value, setValue] = useState(initialValue);
  const textareaRef = useRef(null);
  const primaryButtonRef = useRef(null);

  useLayoutEffect(() => {
    if (textareaRef.current) {
      if (hasCallback) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(0, initialValue.length);
      }

      // Calculate rows based on actual line count + buffer
      const lines = initialValue.split("\n");
      const lineCount = lines.length;

      // Add 2-3 extra rows for editing comfort
      const extraRows = hasCallback ? 3 : 2;
      const calculatedRows = lineCount + extraRows;

      // Calculate max rows based on viewport height
      // Assume ~20px per row, and max 60% of viewport height for textarea
      const maxViewportRows = Math.floor((window.innerHeight * 0.6) / 20);

      // Set rows: minimum 5, maximum based on viewport, with our calculated value in between
      textareaRef.current.rows = Math.min(Math.max(calculatedRows, 5), maxViewportRows, 30);
    }
  }, [initialValue, hasCallback]);

  const handleOk = () => {
    onClose(value, true);
  };

  const handleCancel = () => {
    onClose(null, false);
  };

  if (hasCallback) {
    return (
      <Modal isOpen={true} onClose={handleCancel}>
        <div className="modalBody">
          <div className="modalMessage">{message}</div>
          <textarea ref={textareaRef} className="modalTextarea" value={value} onChange={(e) => setValue(e.target.value)} />
          <footer className="modalFooter">
            <button ref={primaryButtonRef} type="button" className="modalBtn primary" onClick={handleOk}>
              OK
            </button>
            <button type="button" className="modalBtn modalBtnSecondary" onClick={handleCancel}>
              Cancel
            </button>
          </footer>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={true} onClose={handleOk}>
      <div className="modalBody">
        <div className="modalMessage">{message}</div>
        <textarea ref={textareaRef} className="modalTextarea modalTextarea--readonly" value={value} readOnly />
        <footer className="modalFooter">
          <button ref={primaryButtonRef} type="button" className="modalBtn primary" onClick={handleOk}>
            OK
          </button>
        </footer>
      </div>
    </Modal>
  );
}

// Modal manager to render modals
const modalManager = {
  container: null,

  init() {
    if (!this.container) {
      this.container = document.createElement("div");
      this.container.id = "modal-root";
      document.body.appendChild(this.container);
    }
  },

  render(component) {
    this.init();
    ReactDOM.render(component, this.container);
  },

  unmount() {
    if (this.container) {
      ReactDOM.unmountComponentAtNode(this.container);
    }
  },
};

// Override window.alert, window.prompt, window.confirm
window.alert = (message) => {
  return new Promise((resolve) => {
    modalManager.render(
      <AlertModal
        message={message}
        type="alert"
        onClose={() => {
          modalManager.unmount();
          resolve();
        }}
      />,
    );
  });
};

window.confirm = (message) => {
  return new Promise((resolve, reject) => {
    modalManager.render(
      <AlertModal
        message={message}
        type="confirm"
        onClose={(confirmed) => {
          modalManager.unmount();
          if (confirmed) {
            resolve();
          } else {
            reject();
          }
        }}
      />,
    );
  });
};

window.prompt = (message, initialValue = "", callback = null) => {
  return new Promise((resolve) => {
    const hasCallback = typeof callback === "function";

    modalManager.render(
      <PromptModal
        message={message}
        initialValue={initialValue}
        hasCallback={hasCallback}
        onClose={(value, confirmed) => {
          modalManager.unmount();
          if (hasCallback) {
            if (confirmed) {
              callback(value);
            }
            resolve(confirmed ? value : null);
          } else {
            resolve(value);
          }
        }}
      />,
    );
  });
};

// component rendering code starts here
(async () => {
  const SAME_TAB_LINK_SPLIT = "|";
  const NEW_TAB_LINK_SPLIT = "|||";
  const HEADER_SPLIT = "#";
  const TITLE_SPLIT = "!";
  const CODE_BLOCK_SPLIT = "```";
  const HTML_BLOCK_SPLIT = "---";
  const TAB_SPLIT = ">>>";
  const TAB_TITLE_SPLIT = "|";
  const FAV_ICON_SPLIT = "@";

  let cacheId = parseInt(Date.now());

  const DEFAULT_SCHEMA_TO_RENDER = `
    ! Navigation ${new Date().toLocaleString()}

    # Main Link Section
    google finance | finance.google.com
    www.cnbc.com

    # Secondary Section
    sample alert js | javascript://alert('hello')
    sample prompt editable js | javascript://prompt('this is an editable prompt','initial value', (a) => {console.log('test123',a)})
    sample prompt readonly js | javascript://prompt('this is a read only prompt','initial value')
    sample confirm js | javascript://confirm('are you sure?')

    # Data URL Section
    sample data url | data:text/html,%3C!doctype%20html%3E%0A%3Chtml%3E%0A%20%20%3Chead%3E%0A%20%20%20%20%3Cmeta%20charset%3D%22UTF-8%22%20%2F%3E%0A%20%20%20%20%3Ctitle%3ELoading...%3C%2Ftitle%3E%0A%20%20%20%20%3Clink%20rel%3D%22stylesheet%22%20href%3D%22https%3A%2F%2Fsynle.github.io%2Fnav-generator%2Findex.css%22%20%2F%3E%0A%20%20%3C%2Fhead%3E%0A%20%20%3Cbody%3E%0A%20%20%20%20%3Cscript%20type%3D'schema'%3E!%20Navigation%202%2F6%2F2026%2C%207%3A32%3A52%20AM%0A%0A%23%20Main%20Link%20Section%0Agoogle%20finance%20%7C%20finance.google.com%0A%0A%23%20Secondary%20Section%0Asample%20alert%20js%20%7C%20javascript%3A%2F%2Falert('hello')%0Asample%20prompt%20editable%20js%20%7C%20javascript%3A%2F%2Fprompt('this%20is%20an%20editable%20prompt'%2C'initial%20value'%2C%20(a)%20%3D%3E%20%7Bconsole.log('test123'%2Ca)%7D)%0Asample%20prompt%20readonly%20js%20%7C%20javascript%3A%2F%2Fprompt('this%20is%20a%20read%20only%20prompt'%2C'initial%20value')%0Asample%20confirm%20js%20%7C%20javascript%3A%2F%2Fconfirm('are%20you%20sure%3F')%0A%0A%23%20Data%20URL%20Section%0Asample%20data%20url%20%7C%20data%3Atext%2Fhtml%2C%253C!doctype%2520html%253E%250A%253Chtml%253E%250A%2520%2520%253Chead%253E%250A%2520%2520%2520%2520%253Cmeta%2520charset%253D%2522UTF-8%2522%2520%252F%253E%250A%2520%2520%2520%2520%253Ctitle%253ELoading...%253C%252Ftitle%253E%250A%2520%2520%2520%2520%253Clink%2520rel%253D%2522stylesheet%2522%2520href%253D%2522http%253A%252F%252F127.0.0.1%253A8080%252Findex.css%2522%2520%252F%253E%250A%2520%2520%253C%252Fhead%253E%250A%2520%2520%253Cbody%253E%250A%2520%2520%2520%2520%253Cscript%2520type%253D'schema'%253E!%2520Navigation%25202%252F6%252F2026%252C%25207%253A32%253A52%2520AM%250A%250A%2523%2520Main%2520Link%2520Section%250Agoogle%2520finance%2520%257C%2520finance.google.com%250A%250A%2523%2520Secondary%2520Section%250Asample%2520alert%2520js%2520%257C%2520javascript%253A%252F%252Falert('hello')%250Asample%2520prompt%2520editable%2520js%2520%257C%2520javascript%253A%252F%252Fprompt('this%2520is%2520an%2520editable%2520prompt'%252C''%252C%2520(a)%2520%253D%253E%2520%257Bconsole.log('test123'%252Ca)%257D)%250Asample%2520prompt%2520readonly%2520js%2520%257C%2520javascript%253A%252F%252Fprompt('this%2520is%2520a%2520read%2520only%2520prompt')%250Asample%2520confirm%2520js%2520%257C%2520javascript%253A%252F%252Fconfirm('are%2520you%2520sure%253F')%250A%250A%2523%2520Data%2520URL%2520Section%250Asample%2520data%2520url%2520%257C%2520data%253Atext%252Fhtml%252C%25253Chtml%25253E%25250A%252520%252520%25253Chead%25253E%25250A%252520%252520%252520%252520%25253Cmeta%252520charset%25253D'utf-8'%252520%25252F%25253E%25250A%252520%252520%252520%252520%25253Ctitle%25253ELoading...%25253C%25252Ftitle%25253E%25250A%252520%252520%252520%252520%25253Clink%252520rel%25253D%252522stylesheet%252522%252520href%25253D%252522http%25253A%25252F%25252Flocalhost%25253A8080%25252Findex.css%252522%252520%25252F%25253E%25250A%252520%252520%25253C%25252Fhead%25253E%25250A%252520%252520%25253Cload%252520%25252F%25253E%25250A%252520%252520%25253Cscript%252520type%25253D'schema'%25253E!%252520Data%252520Test%252520Navigation%25250A%25250A%252523%252520Main%252520Section%25250Agoogle%25257Cgoogle.com%25253C%25252Fscript%25253E%25250A%252520%252520%25253Cscript%252520src%25253D'https%25253A%25252F%25252Funpkg.com%25252F%252540babel%25252Fstandalone%25252Fbabel.min.js'%25253E%25253C%25252Fscript%25253E%25250A%252520%252520%25253Cscript%252520src%25253D'http%25253A%25252F%25252Flocalhost%25253A8080%25252Findex.jsx'%252520type%25253D'text%25252Fbabel'%252520data-presets%25253D'react'%252520data-type%25253D'module'%25253E%25253C%25252Fscript%25253E%25250A%25253C%25252Fhtml%25253E%250A%250A%2523%2520Notes%250A%2560%2560%2560%250ATODO%25201%250ATODO%25202%250A%2560%2560%2560%250A%250A%2523%2520Tabs%250A%253E%253E%253EtabName1%257CblockId1%253E%253E%253EtabName2%257CblockId2%250A%250A%2560%2560%2560blockId1%250Asample%2520blockId1%250A%2560%2560%2560%250A%250A---blockId2%250A%253Cu%253E%253Cb%253Esample%2520html%253C%252Fb%253E%253C%252Fu%253E%2520blockId2%250A---%253C%252Fscript%253E%250A%2520%2520%2520%2520%253Cscript%2520src%253D%2522http%253A%252F%252F127.0.0.1%253A8080%252Findex.js%2522%253E%253C%252Fscript%253E%250A%2520%2520%253C%252Fbody%253E%250A%253C%252Fhtml%253E%0A%0A%23%20Notes%0A%60%60%60%0ATODO%201%0ATODO%202%0A%60%60%60%0A%0A%23%20Tabs%0A%3E%3E%3EtabName1%7CblockId1%3E%3E%3EtabName2%7CblockId2%0A%0A%60%60%60blockId1%0Asample%20blockId1%0A%60%60%60%0A%0A---blockId2%0A%3Cu%3E%3Cb%3Esample%20html%3C%2Fb%3E%3C%2Fu%3E%20blockId2%0A---%3C%2Fscript%3E%0A%20%20%20%20%3Cscript%20src%3D%22https%3A%2F%2Fsynle.github.io%2Fnav-generator%2Findex.js%22%3E%3C%2Fscript%3E%0A%20%20%3C%2Fbody%3E%0A%3C%2Fhtml%3E

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
    .split("\n")
    .map((s) => s.trim())
    .join("\n");

  // private methods
  async function _navigateToDataUrl(base64URL, forceOpenWindow) {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(decodeURIComponent(base64URL.replace("data:text/html,", "")), "text/html");
      const schema = doc.querySelector("[type=schema]").innerText.trim();
      const childWindow = window.open(`${APP_INDEX_URL}?loadNav`);

      // post message to redirect the data url accordingly
      const intervalTryPostingMessage = setInterval(_doPostMessage, 100);
      setTimeout(() => clearInterval(intervalTryPostingMessage), 5000);

      function _doPostMessage() {
        childWindow.postMessage({ type: "onViewLinks", schema }, "*");
      }
    } catch (err) {
      // show it in the prompt
      await prompt("Data URL (Copy to clipboard):", base64URL);
    }
  }

  function _getNavBookmarkletFromSchema(input) {
    input = input.trim();

    let rawOutput = `
<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>Loading...</title>
  </head>
  <body>
    <js_script type='schema'>${input}</js_script>
    <js_script src="${APP_UPSTREAM_DEFAULT_BASE_URL}/index.js"></js_script>
  </body>
</html>
    `
      .trim()
      .replace(/js_script/g, "script");

    return "data:text/html," + encodeURIComponent(rawOutput);
  }

  function _dispatchEvent(target, evName, evExtra = {}) {
    const evType = "MouseEvents";
    const evObj = document.createEvent(evType);
    evObj.initEvent(evName, true, false);

    for (const extraKey of Object.keys(evExtra)) {
      evObj[extraKey] = evExtra[extraKey];
    }

    target.dispatchEvent(evObj);
  }

  function _dispatchCustomEvent(target, evName, evExtra = {}) {
    const evObj = new Event(evName);

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
    } catch (err) {
      // Session storage not available
    }
  }

  function _getSessionValue(key) {
    try {
      return sessionStorage[key] || "";
    } catch (err) {
      return "";
    }
  }

  function _setLocalValue(key, value) {
    try {
      localStorage[key] = value;
    } catch (err) {
      // Local storage not available
    }
  }

  function _getLocalValue(key) {
    try {
      return localStorage[key] || "";
    } catch (err) {
      return "";
    }
  }

  function _persistBufferSchema(value) {
    _setSessionValue("schemaData", value);
  }

  function _getPersistedBufferSchema() {
    return _getSessionValue("schemaData");
  }

  function _onCopyToClipboard(text) {
    _dispatchCustomEvent(document, "AppCopyTextToClipboard", { text });
  }

  function _addScript(src) {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = src;
      script.onload = resolve;
      document.head.appendChild(script);
    });
  }

  function _addStyle(src, rel = "stylesheet/less") {
    return new Promise((resolve) => {
      const link = document.createElement("link");
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
      .split("\n")
      .filter((r) => r.indexOf("//") !== 0)
      .map((r) => r.trimEnd());

    if (lines[0][0] !== "!") {
      const headerSchemaSampleCode = `${TITLE_SPLIT} Unnamed Navigation - ${new Date().toLocaleString()}`;
      lines.unshift(headerSchemaSampleCode);
    }

    let blockBuffer = [];
    let isInABlock = false;
    let blockType = ""; // code or html
    let currentHeaderName = "";
    let blockId = "";
    let pageFavIcon = "📑";

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
      if (isInABlock) {
        let valueToUse = "";

        // attempt to format it as html
        valueToUse = blockBuffer.join("\n");
        try {
          valueToUse = JSON.stringify(JSON.parse(valueToUse), null, 2);
        } catch (err) {}

        if (blockType === "code" && link.trim() === CODE_BLOCK_SPLIT) {
          serializedSchema.push({
            key: newCacheId,
            id: _upsertBlockId(blockId),
            value: valueToUse,
            type: "code_block",
          });
          isInABlock = false;
          blockBuffer = [];
          blockType = "";
          currentHeaderName = "";
          blockId = "";
        } else if (blockType === "html" && link.trim() === HTML_BLOCK_SPLIT) {
          serializedSchema.push({
            key: newCacheId,
            id: _upsertBlockId(blockId),
            value: valueToUse,
            type: "html_block",
          });
          isInABlock = false;
          blockBuffer = [];
          blockType = "";
          currentHeaderName = "";
          blockId = "";
        } else {
          blockBuffer.push(link);
        }
        return;
      }

      if (link.trim().indexOf(FAV_ICON_SPLIT) === 0) {
        pageFavIcon = link.replace(/^[@]+/, "").trim();
        serializedSchema.push({
          key: newCacheId,
          value: pageFavIcon,
          type: "favIcon",
        });
      } else if (link.trim().indexOf(TITLE_SPLIT) === 0) {
        const headerText = link.replace(TITLE_SPLIT, "").trim();
        serializedSchema.push({
          key: newCacheId,
          value: headerText,
          type: "title",
        });
      } else if (link.trim().indexOf(HEADER_SPLIT) === 0) {
        const headerText = link.replace(HEADER_SPLIT, "").trim();
        serializedSchema.push({
          key: newCacheId,
          value: headerText,
          type: "header",
        });

        currentHeaderName = headerText;
      } else if (link.trim().indexOf(CODE_BLOCK_SPLIT) === 0) {
        isInABlock = true;
        blockType = "code";
        if (link.length > CODE_BLOCK_SPLIT.length) {
          blockId = link.substr(blockId.indexOf(CODE_BLOCK_SPLIT) + CODE_BLOCK_SPLIT.length + 1);
          _upsertBlockId(blockId);
        }
      } else if (link.trim().indexOf(HTML_BLOCK_SPLIT) === 0) {
        isInABlock = true;
        blockType = "html";
        if (link.length > HTML_BLOCK_SPLIT.length) {
          blockId = link.substr(blockId.indexOf(HTML_BLOCK_SPLIT) + HTML_BLOCK_SPLIT.length + 1);
          _upsertBlockId(blockId);
        }
      } else if (link.trim().indexOf(TAB_SPLIT) === 0) {
        let tabContent = [];
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
          type: "tabs",
          tabContent: tabContent,
        });
      } else if (link.trim().length > 0) {
        let linkType;
        let linkText, linkUrl;

        try {
          // try parse as new tab link
          if (link.indexOf(NEW_TAB_LINK_SPLIT) !== -1 && link.indexOf(NEW_TAB_LINK_SPLIT) <= link.indexOf(SAME_TAB_LINK_SPLIT)) {
            linkText = link.substr(0, link.indexOf(NEW_TAB_LINK_SPLIT)).trim();
            linkUrl = link.substr(link.indexOf(NEW_TAB_LINK_SPLIT) + NEW_TAB_LINK_SPLIT.length).trim();
            linkType = "newTabLink";
          }
        } catch (err) {}

        if (!linkType) {
          try {
            if (link.length > 0 && SAME_TAB_LINK_SPLIT.includes(SAME_TAB_LINK_SPLIT)) {
              linkText = link.substr(0, link.indexOf(SAME_TAB_LINK_SPLIT)).trim();
              linkUrl = link.substr(link.indexOf(SAME_TAB_LINK_SPLIT) + SAME_TAB_LINK_SPLIT.length).trim();
              linkType = "sameTabLink";
            }
          } catch (err) {}
        }
        if (linkType) {
          if (linkUrl.indexOf("/") === 0) {
            linkUrl = `${location.origin}${linkUrl}`;
          } else if (
            linkUrl.indexOf("http://") !== 0 &&
            linkUrl.indexOf("https://") !== 0 &&
            linkUrl.indexOf("javascript://") !== 0 &&
            linkUrl.indexOf("data:") !== 0
          ) {
            linkUrl = `https://${linkUrl}`;
          }

          if (linkUrl.indexOf("javascript://") === 0) {
            linkType = "jsLink";
            linkUrl = linkUrl.replace("javascript://", "");
            linkUrl = `(async() => {${linkUrl}})()`;
          } else if (linkUrl.indexOf("data:") === 0) {
            linkType = "dataLink";
          }

          if (!linkText) {
            // Generate linkText from domain if not provided
            try {
              if (linkType === "jsLink") {
                linkText = "JS Link";
              } else if (linkType === "dataLink") {
                linkText = "Data URL Link";
              } else {
                // Generate linkText from domain for regular URLs only
                const url = new URL(linkUrl);
                let hostname = url.hostname.replace(/^www\./, "");
                const parts = hostname.split(".");
                // Get root domain name (second-to-last part before TLD)
                linkText = parts.length >= 2 ? parts[parts.length - 2] : hostname;
              }
            } catch (e) {
              // If URL parsing fails, use the raw linkUrl
              linkText = linkUrl.substr(0, 20) + "...";
            }
          }

          serializedSchema.push({
            key: newCacheId,
            type: "link",
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
    const { onSearch, searchText, onClear, resultCount } = props;
    const [showHelp, setShowHelp] = useState(false);

    return (
      <div className="search-container">
        <div className="search-input-wrapper">
          <span className="search-icon">🔍</span>
          <input
            id="search"
            onInput={(e) => onSearch(e.target.value)}
            placeholder="Search bookmarks..."
            autoComplete="off"
            spellCheck="false"
            value={searchText}
          />
          {searchText && (
            <>
              <span className="search-result-count">{resultCount} results</span>
              <button type="button" className="search-clear-btn" onClick={onClear} aria-label="Clear search" title="Clear search">
                ✕
              </button>
            </>
          )}
          <button
            type="button"
            className="search-help-btn"
            onClick={() => setShowHelp(!showHelp)}
            aria-label="Search help"
            title="Search shortcuts"
          >
            ?
          </button>
        </div>
        {showHelp && (
          <div className="search-help-popup">
            <div className="search-help-header">
              Search Shortcuts
              <button type="button" className="search-help-close" onClick={() => setShowHelp(false)}>
                ✕
              </button>
            </div>
            <div className="search-help-content">
              <div className="search-help-item">
                <code>/term</code>
                <span>Fuzzy search (matches scattered letters)</span>
              </div>
              <div className="search-help-item">
                <code>?term</code>
                <span>Google search on submit</span>
              </div>
              <div className="search-help-item">
                <code>Alt+Enter</code>
                <span>Google search (any query)</span>
              </div>
              <div className="search-help-item">
                <code>Enter</code>
                <span>Navigate if single result</span>
              </div>
              <div className="search-help-item">
                <code>Esc</code>
                <span>Clear search and blur</span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  function PageRead(props) {
    const { schema, onSetViewMode, onSetSchema } = props;
    const [searchText, setSearchText] = useState("");
    const [resultCount, setResultCount] = useState(0);

    const refContainer = useRef();

    // events
    const onSearch = useCallback((newSearchText) => {
      setSearchText(newSearchText);
    }, []);

    const onClearSearch = useCallback(() => {
      setSearchText("");
      setResultCount(0);
      document.querySelector("#search")?.focus();
    }, []);

    const onSubmitNavigationSearch = useCallback(
      (e) => {
        e.preventDefault();

        if (refContainer && refContainer.current) {
          const doc = refContainer.current;

          const [firstSearchChar, ...searchWord] = searchText;
          if (firstSearchChar === "?") {
            location.href = `https://www.google.com/search?q=${searchWord.join("")}`;
          }

          const links = [...doc.querySelectorAll(".link:not(.hidden)")];

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
      },
      [searchText],
    );

    // handling search
    useLayoutEffect(() => {
      const trimmedSearchText = (searchText || "").trim();

      if (!refContainer?.current) return;

      const doc = refContainer.current;
      const links = doc.querySelectorAll(".link");
      const otherNonLinks = doc.querySelectorAll(":scope > *:not(.form-search-excluded)");
      const allElems = [...links, ...otherNonLinks];

      // Helper to clear all search highlights from links
      function clearHighlights() {
        doc.querySelectorAll(".link mark.search-highlight").forEach((mark) => {
          const parent = mark.parentNode;
          parent.replaceChild(document.createTextNode(mark.textContent), mark);
          parent.normalize();
        });
      }

      // Reset case
      if (!trimmedSearchText) {
        setResultCount(links.length);
        allElems.forEach((elem) => elem.classList.toggle("hidden", false));
        clearHighlights();
        return;
      } else {
        allElems.forEach((elem) => elem.classList.toggle("hidden", true));
      }

      function escapeRegex(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      }

      const isFuzzy = trimmedSearchText.startsWith("/");

      // Build regex ONCE
      let matchRegex;

      if (isFuzzy) {
        const cleaned = trimmedSearchText
          .slice(1)
          .replace(/[\W_]+/g, " ")
          .replace(/\s+/g, " ")
          .trim();

        const pattern = cleaned
          .split("")
          .map((c) => escapeRegex(c))
          .join(".*?");

        matchRegex = new RegExp(pattern, "i");
      } else {
        matchRegex = new RegExp(escapeRegex(trimmedSearchText), "i");
      }

      // Build a highlight regex that captures the matched portion
      let highlightRegex;
      if (isFuzzy) {
        const cleaned = trimmedSearchText
          .slice(1)
          .replace(/[\W_]+/g, " ")
          .replace(/\s+/g, " ")
          .trim();

        const pattern = cleaned
          .split("")
          .map((c) => "(" + escapeRegex(c) + ")")
          .join("(.*?)");

        highlightRegex = new RegExp(pattern, "i");
      } else {
        highlightRegex = new RegExp("(" + escapeRegex(trimmedSearchText) + ")", "gi");
      }

      // Apply highlight markup to a text node
      function applyHighlightToTextNode(textNode, regex, fuzzy) {
        const text = textNode.textContent;
        const match = regex.exec(text);
        if (!match) return;

        const frag = document.createDocumentFragment();

        if (fuzzy) {
          // For fuzzy matches, each odd-indexed capture group is a matched char
          let pos = 0;
          const fullMatchStart = match.index;
          const fullMatchEnd = match.index + match[0].length;

          // Text before the full match
          if (fullMatchStart > 0) {
            frag.appendChild(document.createTextNode(text.substring(0, fullMatchStart)));
          }

          // Walk through matched portion character by character
          let innerPos = fullMatchStart;
          for (let g = 1; g < match.length; g++) {
            if (match[g] === undefined) continue;
            const groupStart = text.indexOf(match[g], innerPos);
            // For odd groups (the actual matched chars), highlight them
            if (g % 2 === 1) {
              const mark = document.createElement("mark");
              mark.className = "search-highlight";
              mark.textContent = match[g];
              frag.appendChild(mark);
            } else {
              // Even groups are the in-between text
              frag.appendChild(document.createTextNode(match[g]));
            }
            innerPos += match[g].length;
          }

          // Text after the full match
          if (fullMatchEnd < text.length) {
            frag.appendChild(document.createTextNode(text.substring(fullMatchEnd)));
          }
        } else {
          // Simple substring highlight - highlight all occurrences
          let lastIndex = 0;
          const globalRegex = new RegExp("(" + escapeRegex(trimmedSearchText) + ")", "gi");
          let m;
          while ((m = globalRegex.exec(text)) !== null) {
            if (m.index > lastIndex) {
              frag.appendChild(document.createTextNode(text.substring(lastIndex, m.index)));
            }
            const mark = document.createElement("mark");
            mark.className = "search-highlight";
            mark.textContent = m[1];
            frag.appendChild(mark);
            lastIndex = m.index + m[0].length;
          }
          if (lastIndex < text.length) {
            frag.appendChild(document.createTextNode(text.substring(lastIndex)));
          }
          if (lastIndex === 0) return; // no matches found
        }

        textNode.parentNode.replaceChild(frag, textNode);
      }

      // Highlight matching text inside a link element
      function highlightLink(elem) {
        // Walk text nodes and apply highlights
        const walker = document.createTreeWalker(elem, NodeFilter.SHOW_TEXT, null);
        const textNodes = [];
        let node;
        while ((node = walker.nextNode())) {
          textNodes.push(node);
        }
        textNodes.forEach((tn) => {
          applyHighlightToTextNode(tn, isFuzzy ? highlightRegex : highlightRegex, isFuzzy);
          // Reset lastIndex for regex reuse
          highlightRegex.lastIndex = 0;
        });
      }

      let visibleCount = 0;

      // Clear previous highlights before applying new ones
      clearHighlights();

      // Only consider links for matching
      links.forEach((elem) => {
        const text = elem.innerText || "";
        const section = elem.dataset.section || "";

        const isMatch = matchRegex.test(text) || matchRegex.test(section);

        elem.classList.toggle("hidden", !isMatch);

        if (isMatch) {
          visibleCount++;
          highlightLink(elem);
        }
      });

      setResultCount(visibleCount);
    }, [searchText, refContainer.current]);

    // Arrow key navigation for links in the grid
    useEffect(() => {
      const container = refContainer.current;
      if (!container) return;

      function handleKeyDown(e) {
        const focused = document.activeElement;
        if (!focused || !focused.classList.contains("link")) return;
        if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) return;

        const allLinks = Array.from(container.querySelectorAll(".link:not(.hidden)"));
        const currentIndex = allLinks.indexOf(focused);
        if (currentIndex === -1) return;

        let targetIndex = -1;

        if (e.key === "ArrowLeft") {
          targetIndex = currentIndex - 1;
        } else if (e.key === "ArrowRight") {
          targetIndex = currentIndex + 1;
        } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
          // Find the link above/below by comparing visual positions
          const focusedRect = focused.getBoundingClientRect();
          const focusCenterX = focusedRect.left + focusedRect.width / 2;
          let bestMatch = null;
          let bestDistance = Infinity;

          for (let i = 0; i < allLinks.length; i++) {
            if (i === currentIndex) continue;
            const rect = allLinks[i].getBoundingClientRect();
            const centerY = rect.top + rect.height / 2;
            const focusCenterY = focusedRect.top + focusedRect.height / 2;

            const isCorrectDirection = e.key === "ArrowDown" ? centerY > focusCenterY + 1 : centerY < focusCenterY - 1;
            if (!isCorrectDirection) continue;

            const verticalDist = Math.abs(centerY - focusCenterY);
            const horizontalDist = Math.abs(rect.left + rect.width / 2 - focusCenterX);
            // Prioritize vertical proximity, then horizontal closeness
            const distance = verticalDist * 1000 + horizontalDist;

            if (distance < bestDistance) {
              bestDistance = distance;
              bestMatch = i;
            }
          }

          if (bestMatch !== null) targetIndex = bestMatch;
        }

        if (targetIndex >= 0 && targetIndex < allLinks.length) {
          e.preventDefault();
          allLinks[targetIndex].focus();
        }
      }

      container.addEventListener("keydown", handleKeyDown);
      return () => container.removeEventListener("keydown", handleKeyDown);
    }, [refContainer.current]);

    // Force full reload when user navigates back (bfcache)
    useEffect(() => {
      function onPageShow(e) {
        if (e.persisted) {
          window.location.reload();
        }
      }

      window.addEventListener("pageshow", onPageShow);
      return () => window.removeEventListener("pageshow", onPageShow);
    }, []);

    return (
      <div id="fav" ref={refContainer}>
        <SchemaRender schema={schema} refContainer={refContainer} onSetViewMode={onSetViewMode} />
        <form id="searchForm" className="form-search-excluded" onSubmit={(e) => onSubmitNavigationSearch(e)}>
          <SearchBox onSearch={onSearch} searchText={searchText} onClear={onClearSearch} resultCount={resultCount} />
        </form>
      </div>
    );
  }

  function PageEdit(props) {
    const { schema, onSetViewMode, onSetSchema } = props;
    const [bufferSchema, setBufferSchema] = useState(schema.trim());
    const [hasPendingChanges, setHasPendingChanges] = useState(false);
    const [bookmark, setBookmark] = useState("");

    // events
    const onApply = useCallback(() => {
      onSetSchema(bufferSchema); // update schema
      onSetViewMode("read");

      //update the cache in the session storage
      _persistBufferSchema(bufferSchema); // commit the changes
      createVersion(bufferSchema); // persist the schema in indexed db for version history
    }, [bufferSchema]);

    const onCancel = useCallback(async () => {
      if (hasPendingChanges) {
        try {
          await confirm("You have unsaved changes. Discard unsaved changes?");
        } catch (err) {
          // user cancel, then stop...
          return;
        }
      }

      onSetViewMode("read");
    }, []);

    const onTest = useCallback(() => {
      const base64URL = _getNavBookmarkletFromSchema(bufferSchema);
      _navigateToDataUrl(base64URL, true);
    }, [bufferSchema]);

    const onSetBufferSchema = useCallback((newBufferSchema) => {
      setBufferSchema(newBufferSchema);
      setHasPendingChanges(true);
    }, []);

    function onSortSchemaBySectionNameAndTitle(schema) {
      const rows = schema.split("\n");
      let sections = [];
      let sectionIdx = 0;

      for (const row of rows) {
        if (row[0] === "#") {
          sectionIdx++;
        }
        sections[sectionIdx] = sections[sectionIdx] || [];
        sections[sectionIdx].push(row);
      }

      sections = sections
        .filter((s) => !!s && s.length > 0)
        .map((s) => {
          if (s[s.length - 1] !== "") {
            s.push("");
          }
          return s;
        })
        .sort(_schemaSectionNameOnlySorter);

      const newBufferSchema = sections.map((s) => s.join("\n")).join("\n");
      setBufferSchema(newBufferSchema);
    }

    // effects
    useLayoutEffect(() => {
      // store it into cache
      _persistBufferSchema(schema);

      // hook up the tab and shift tab to do modification
      return () => {
        window.onbeforeunload = undefined;
      };
    }, []);

    // trigger the confirmation to save before unload
    useLayoutEffect(() => {
      if (hasPendingChanges) {
        window.onbeforeunload = function (e) {
          e.preventDefault();
          return (e.returnValue = "You have unsaved changes. Do you want to continue with exit?");
        };
      }
    }, [hasPendingChanges]);

    // update bookmarklet
    useLayoutEffect(() => {
      setBookmark(_getNavBookmarkletFromSchema(bufferSchema));
    }, [bufferSchema]);

    // generate the view
    return (
      <div id="command">
        <div className="title">
          Edit Navigation
          <div className="action-bar">
            <button id="applyEdit" type="button" role="button" onClick={() => onApply()}>
              Apply
            </button>
            <button id="cancelEdit" type="button" role="button" onClick={() => onCancel()}>
              Cancel
            </button>
            <DropdownButtons>
              <button className="dropdown-trigger" type="button">
                Actions
              </button>
              <a role="button" target="_blank" href={NEW_NAV_URL}>
                New Nav
              </a>
              <button onClick={() => onSortSchemaBySectionNameAndTitle(bufferSchema)}>Sort Schema</button>
              <button className="copyBookmarkToClipboard" onClick={() => _onCopyToClipboard(bookmark)}>
                Copy Bookmark
              </button>
              <button onClick={() => _onCopyToClipboard(bufferSchema)}>Copy Schema</button>
              <a role="button" target="_blank" href="https://github.com/synle/nav-generator/blob/main/index.jsx">
                JS Code
              </a>
              <a role="button" target="_blank" href="https://github.com/synle/nav-generator/blob/main/index.scss">
                CSS Code
              </a>
              <button type="button" onClick={onTest}>
                Test
              </button>
              <a role="button" href={_getUrlDownloadSchema(schema)} download={`schema.${new Date().getTime()}.txt`}>
                Download Schema
              </a>
              <a role="button" href={bookmark} download={`bookmark.${new Date().getTime()}.html`}>
                Download Bookmark
              </a>
            </DropdownButtons>
          </div>
        </div>
        <SchemaEditor
          id="input"
          wrap="soft"
          spellcheck="false"
          value={bufferSchema}
          onInput={(e) => onSetBufferSchema(e.target.value)}
          onBlur={(e) => onSetBufferSchema(e.target.value)}
        ></SchemaEditor>
      </div>
    );
  }

  function _getFaviconUrl(url) {
    // Extract domain from URL
    let domain = url.match(/^(?:https?:\/\/)?(?:[^@\n]+@)?(?:www\.)?([^:\/\n]+)/im)[1];

    // Add "/favicon.ico" to the domain
    return `${domain}/favicon.ico`;
  }

  function FavIcon(props) {
    const { linkUrl, linkType } = props;
    const [error, setError] = useState(false);

    if (!error) {
      switch (linkType) {
        default:
          if (linkUrl.indexOf("http://") === 0 || linkUrl.indexOf("https://") === 0) {
            let favIconUrl = `http://${_getFaviconUrl(linkUrl)}`;
            return (
              <img
                src={favIconUrl}
                alt="Fav"
                onError={(e) => {
                  setError(true);
                }}
              />
            );
          }
          break;
      }
    }

    return <span>📙</span>;
  }

  function SchemaRender(props) {
    const { schema, refContainer, onSetViewMode } = props;
    const [doms, setDoms] = useState(null);

    // handling tabs
    useLayoutEffect(() => {
      if (refContainer && refContainer.current) {
        const doc = refContainer.current;

        const tabsList = [...doc.querySelectorAll("tabs")];

        for (const tabs of tabsList) {
          const tabChildren = [...tabs.querySelectorAll("tab")];

          // trigger first tab selection
          _dispatchEvent(tabChildren[0], "click");
        }
      }
    }, [doms, refContainer.current]);

    // generate the view dom
    useLayoutEffect(() => {
      const serializedSchema = _getSerializedSchema(schema);

      const newDoms = serializedSchema.map((schemaComponent) => {
        switch (schemaComponent.type) {
          case "title":
            // set the page title
            document.title = schemaComponent.value;

            return (
              <div
                id={schemaComponent.id}
                key={schemaComponent.key}
                className="title form-search-excluded"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                {schemaComponent.value}

                <div className='action-bar'>
                  {onSetViewMode ? (
                    <>
                      <button id="edit" onClick={() => onSetViewMode("edit")} role="button">
                        Edit
                      </button>
                      <DropdownButtons>
                        <button className="dropdown-trigger">Actions</button>
                        <a role="button" target="_blank" href={NEW_NAV_URL}>
                          New Nav
                        </a>
                        <button
                          className="copyBookmarkToClipboard"
                          onClick={() => _onCopyToClipboard(_getNavBookmarkletFromSchema(schema))}
                        >
                          Copy Bookmark
                        </button>
                        <button onClick={() => onSetViewMode("bookmark_import_chrome")}>Import Chrome Bookmarks</button>
                        <button onClick={() => onSetViewMode("bookmark_export_chrome")}>Export Chrome Bookmarks</button>
                        <a role="button" href={_getUrlDownloadSchema(schema)} download={`schema.${new Date().getTime()}.txt`}>
                          Download Schema
                        </a>
                      </DropdownButtons>
                      <VersionHistoryButton key={Date.now()} {...props} />
                    </>
                  ) : null}

                  <DropdownButtons>
                    <button className="dropdown-trigger">Settings</button>
                    <ThemeToggle />
                  </DropdownButtons>
                </div>
              </div>
            );
          case "favIcon":
            // insert the fav icon
            const pageFavIcon = schemaComponent.value;
            document.querySelector("#pageFavIcon") && document.querySelector("#pageFavIcon").remove();
            const favIconEncoded =
              encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 18 18'><text x='0' y='14'>`) +
              pageFavIcon +
              encodeURIComponent(`</text></svg>`);
            document.head.insertAdjacentHTML(
              "beforeend",
              `<link id='pageFavIcon' data-fav-icon="${pageFavIcon}" rel="icon" href="data:image/svg+xml,${favIconEncoded}" />`,
            );
            break;
          case "header":
            return (
              <div id={schemaComponent.id} key={schemaComponent.key} className="header">
                {schemaComponent.value}
              </div>
            );
          case "code_block":
            return (
              <pre
                id={schemaComponent.id}
                key={schemaComponent.key}
                className="block codeBlock"
                onDoubleClick={(e) => _onCopyToClipboard(e.target.innerText.trim())}
              >
                {schemaComponent.value}
              </pre>
            );
          case "html_block":
            return (
              <div
                id={schemaComponent.id}
                key={schemaComponent.key}
                className="block htmlBlock"
                dangerouslySetInnerHTML={{ __html: schemaComponent.value }}
              ></div>
            );
          case "tabs":
            const tabContent = [];
            for (const tab of schemaComponent.tabContent) {
              tabContent.push(
                <tab className="tab" tabIndex="0" data-tab-id={tab.tabId}>
                  {tab.tabName}
                </tab>,
              );
            }
            return (
              <tabs id={schemaComponent.id} key={schemaComponent.key} className="tabs">
                {tabContent}
              </tabs>
            );
          case "link":
            const _onLinkNavigate = (e) => {
              e.currentTarget.classList.add("navigating");
            };
            const _onLinkBlur = (e) => {
              e.currentTarget.classList.remove("navigating");
            };

            switch (schemaComponent.linkType) {
              case "newTabLink":
                return (
                  <a
                    id={schemaComponent.id}
                    key={schemaComponent.key}
                    className="link newTabLink"
                    role="button"
                    target="_blank"
                    href={schemaComponent.linkUrl}
                    data-section={schemaComponent.headerName}
                    onClick={_onLinkNavigate}
                    onBlur={_onLinkBlur}
                  >
                    <FavIcon {...schemaComponent} /> {schemaComponent.linkText}
                  </a>
                );
              case "sameTabLink":
                return (
                  <a
                    id={schemaComponent.id}
                    key={schemaComponent.key}
                    className="link sameTabLink"
                    role="button"
                    href={schemaComponent.linkUrl}
                    data-section={schemaComponent.headerName}
                    onClick={_onLinkNavigate}
                    onBlur={_onLinkBlur}
                  >
                    <FavIcon {...schemaComponent} /> {schemaComponent.linkText}
                  </a>
                );
              case "jsLink":
                return (
                  <button
                    id={schemaComponent.id}
                    key={schemaComponent.key}
                    className="link jsLink"
                    type="button"
                    onClick={(e) => {
                      _onLinkNavigate(e);
                      eval(schemaComponent.linkUrl);
                    }}
                    onBlur={_onLinkBlur}
                    data-section={schemaComponent.headerName}
                  >
                    <FavIcon {...schemaComponent} /> {schemaComponent.linkText}
                  </button>
                );
              case "dataLink":
                return (
                  <button
                    id={schemaComponent.id}
                    key={schemaComponent.key}
                    className="link dataLink"
                    type="button"
                    onClick={(e) => {
                      _onLinkNavigate(e);
                      _navigateToDataUrl(schemaComponent.linkUrl);
                    }}
                    onBlur={_onLinkBlur}
                    data-section={schemaComponent.headerName}
                  >
                    <FavIcon {...schemaComponent} /> {schemaComponent.linkText}
                  </button>
                );
            }
            break;
        }
      });

      // update the doms
      setDoms(newDoms);
    }, [schema]);

    return <>{doms}</>;
  }

  // Track whether custom nav-generator language has been registered
  let navGeneratorLanguageRegistered = false;

  function registerNavGeneratorLanguage(monaco) {
    if (navGeneratorLanguageRegistered) return;
    navGeneratorLanguageRegistered = true;

    monaco.languages.register({ id: "nav-generator" });

    monaco.languages.setMonarchTokensProvider("nav-generator", {
      tokenizer: {
        root: [
          [/^!\s+.*$/, "page-title"],
          [/^#+\s+.*$/, "section-header"],
          [/^>>>.*$/, "tab-definition"],
          [/^(---)([\w]*)$/, ["html-delimiter", "block-id"]],
          [/^(```)([\w]*)$/, ["code-fence", "block-id"]],
          [/^(.+?)(\s*\|\|\|\s*)(.+)$/, ["link-label", "separator-new-tab", "url"]],
          [/^(.+?)(\s*\|\s*)(.+)$/, ["link-label", "separator-same-tab", "url"]],
          [/^https?:\/\/[^\s]+$/, "url"],
          [/^www\.[^\s]+$/, "url"],
          [/^[a-zA-Z0-9.-]+\.(com|org|net|io|dev|app|co)[^\s]*$/, "url"],
        ],
      },
    });

    monaco.editor.defineTheme("nav-generator-light", {
      base: "vs",
      inherit: true,
      rules: [
        { token: "page-title", foreground: "0066cc", fontStyle: "bold" },
        { token: "section-header", foreground: "267f99", fontStyle: "bold" },
        { token: "tab-definition", foreground: "7f3b9f", fontStyle: "bold" },
        { token: "html-delimiter", foreground: "e91e63", fontStyle: "bold" },
        { token: "code-fence", foreground: "00897b", fontStyle: "bold" },
        { token: "block-id", foreground: "996600", fontStyle: "italic" },
        { token: "link-label", foreground: "283593", fontStyle: "bold" },
        { token: "separator-new-tab", foreground: "ff6600", fontStyle: "bold" },
        { token: "separator-same-tab", foreground: "008800", fontStyle: "bold" },
        { token: "url", foreground: "0000ff", fontStyle: "underline" },
      ],
      colors: {},
    });

    monaco.editor.defineTheme("nav-generator-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "page-title", foreground: "4fc3f7", fontStyle: "bold" },
        { token: "section-header", foreground: "81c784", fontStyle: "bold" },
        { token: "tab-definition", foreground: "ba68c8", fontStyle: "bold" },
        { token: "html-delimiter", foreground: "ff1744", fontStyle: "bold" },
        { token: "code-fence", foreground: "26c6da", fontStyle: "bold" },
        { token: "block-id", foreground: "ffb74d", fontStyle: "italic" },
        { token: "link-label", foreground: "9fa8da", fontStyle: "bold" },
        { token: "separator-new-tab", foreground: "ff9800", fontStyle: "bold" },
        { token: "separator-same-tab", foreground: "66bb6a", fontStyle: "bold" },
        { token: "url", foreground: "64b5f6", fontStyle: "underline" },
      ],
      colors: {},
    });
  }

  function SchemaEditor(props) {
    const { value, onInput, onBlur, autoFocus, id, type = "nav-generator", readOnly = false, ...restProps } = props;
    const editorRef = useRef(null);
    const [useFallback, setUseFallback] = useState(false);

    const currentTheme = document.documentElement.getAttribute("data-theme");
    const language = type === "html" ? "html" : "nav-generator";
    const editorTheme = currentTheme === "light" ? "nav-generator-light" : "nav-generator-dark";

    // Auto-height calculation based on content
    const lineHeight = 20;
    const padding = 20;
    const lineCount = (value || "").split("\n").length;
    const computedHeight = `${Math.max(200, lineCount * lineHeight + padding)}px`;

    // Watch for theme changes and update editor
    useLayoutEffect(() => {
      const observer = new MutationObserver(() => {
        if (editorRef.current) {
          const theme = document.documentElement.getAttribute("data-theme") === "light" ? "nav-generator-light" : "nav-generator-dark";
          editorRef.current.updateOptions({ theme });
        }
      });

      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["data-theme"],
      });

      return () => observer.disconnect();
    }, []);

    function handleEditorWillMount(monaco) {
      registerNavGeneratorLanguage(monaco);
    }

    function handleEditorDidMount(editor, monaco) {
      editorRef.current = editor;

      editor.onDidBlurEditorText(() => {
        if (onBlur) {
          onBlur({ target: { value: editor.getValue() } });
        }
      });

      if (autoFocus) {
        setTimeout(() => editor.focus(), 100);
      }
    }

    function handleEditorChange(newValue) {
      if (onInput) {
        onInput({ target: { value: newValue } });
      }
    }

    function handleEditorValidation() {
      // no-op, can be extended later
    }

    if (useFallback) {
      return <BasicTextarea value={value} onInput={onInput} onBlur={onBlur} autoFocus={autoFocus} id={id} type={type} {...restProps} />;
    }

    return (
      <div id={id} style={{ width: "100%" }}>
        <Editor
          height={computedHeight}
          language={language}
          value={value || ""}
          theme={editorTheme}
          beforeMount={handleEditorWillMount}
          onMount={handleEditorDidMount}
          onChange={handleEditorChange}
          onValidate={handleEditorValidation}
          options={{
            readOnly,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            scrollbar: {
              vertical: "hidden",
              horizontal: "hidden",
              handleMouseWheel: false,
            },
            fontSize: 14,
            fontFamily: 'Menlo, Monaco, "Courier New", monospace',
            lineNumbers: "on",
            wordWrap: "on",
            automaticLayout: true,
            tabSize: 2,
            insertSpaces: true,
            renderWhitespace: "selection",
            contextmenu: true,
            folding: true,
            lineDecorationsWidth: 10,
            lineNumbersMinChars: 4,
          }}
          loading={<div style={{ color: "var(--colorTextMain)" }}>Loading Monaco Editor...</div>}
        />
      </div>
    );
  }

  // Basic textarea fallback with keyboard shortcuts
  function BasicTextarea(props) {
    const { value, onInput, onBlur, type, readOnly = false, ...restProps } = props;

    const onInputKeyDown = useCallback(
      (e) => {
        const TAB_INDENT = "  ";
        switch (e.key) {
          case "Tab":
            e.preventDefault();
            if (e.shiftKey === true) {
              _deleteIndentAtCursor(e.target, TAB_INDENT.length);
            } else {
              _insertIndentAtCursor(e.target, TAB_INDENT);
            }
            break;
          case "Enter":
            e.preventDefault();
            _persistTabIndent(e.target);
            break;
        }

        function _insertIndentAtCursor(myField, myValue) {
          let startPos = myField.selectionStart;
          let endPos = myField.selectionEnd;

          if (startPos === endPos) {
            myField.value = myField.value.substring(0, startPos) + myValue + myField.value.substring(endPos);
            myField.setSelectionRange(startPos + myValue.length, endPos + myValue.length);
          } else {
            const [lineStart, lineEnd] = _getLineStartEnd(myField, startPos, endPos);
            const [res, newStartPos, newEndPos] = _iterateOverRows(myField.value.split("\n"), lineStart, lineEnd, (row) => myValue + row);
            myField.value = res;
            myField.setSelectionRange(newStartPos, newEndPos);
          }
          onInput && onInput({ target: myField });
        }

        function _deleteIndentAtCursor(myField, length) {
          let startPos = myField.selectionStart;
          let endPos = myField.selectionEnd;

          if (startPos === endPos) {
            myField.value = myField.value.substring(0, startPos - 2) + myField.value.substring(endPos);
            myField.setSelectionRange(startPos - length, endPos - length);
          } else {
            const [lineStart, lineEnd] = _getLineStartEnd(myField, startPos, endPos);
            const [res, newStartPos, newEndPos] = _iterateOverRows(myField.value.split("\n"), lineStart, lineEnd, (row) => {
              for (let i = 0; i < row.length; i++) {
                if (row[i] !== " " || i === length) {
                  return row.substr(i);
                }
              }
              return row;
            });
            myField.value = res;
            myField.setSelectionRange(newStartPos, newEndPos);
          }
          onInput && onInput({ target: myField });
        }

        function _persistTabIndent(myField) {
          try {
            const rows = myField.value.substr(0, myField.selectionStart).split("\n");
            const lastRow = rows[rows.length - 1];
            const lastRowIndent = lastRow.match(/^[ ]+/)[0];
            _insertIndentAtCursor(e.target, "\n" + lastRowIndent);
          } catch (err) {
            _insertIndentAtCursor(e.target, "\n");
          }
        }

        function _iterateOverRows(rows, lineStart, lineEnd, func) {
          let newStartPos,
            newEndPos,
            curCharCount = 0;
          const transformFunc = func || ((row) => row);
          const res = [];
          for (let i = 0; i < rows.length; i++) {
            let row = rows[i];
            if (i >= lineStart && i <= lineEnd) row = transformFunc(row);
            if (i === lineStart) newStartPos = curCharCount;
            if (i === lineEnd) newEndPos = curCharCount + row.length;
            curCharCount += row.length + 1;
            res.push(row);
          }
          return [res.join("\n"), newStartPos, newEndPos];
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
      },
      [onInput],
    );

    return (
      <textarea
        onKeyDown={readOnly ? undefined : onInputKeyDown}
        value={value}
        onInput={onInput}
        onBlur={onBlur}
        readOnly={readOnly}
        {...restProps}
      ></textarea>
    );
  }

  function DropdownButtons(props) {
    const { type = "", children } = props;
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    const [triggerButton, ...buttonsElems] = children;

    const toggleDropdown = useCallback(() => {
      setIsOpen((prev) => !prev);
    }, []);

    const closeDropdown = useCallback(() => {
      setIsOpen(false);
    }, []);

    // Close dropdown when clicking outside
    useLayoutEffect(() => {
      const handleClickOutside = (event) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
          closeDropdown();
        }
      };

      const handleEscape = (event) => {
        if (event.key === "Escape" && isOpen) {
          closeDropdown();
        }
      };

      if (isOpen) {
        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("keydown", handleEscape);
        return () => {
          document.removeEventListener("mousedown", handleClickOutside);
          document.removeEventListener("keydown", handleEscape);
        };
      }
    }, [isOpen, closeDropdown]);

    // Clone trigger button to add onClick handler
    const enhancedTrigger = React.cloneElement(triggerButton, {
      onClick: (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleDropdown();
        if (triggerButton.props.onClick) {
          triggerButton.props.onClick(e);
        }
      },
      "aria-expanded": isOpen,
      "aria-haspopup": "true",
    });

    // Wrap buttons to close dropdown on click
    const enhancedButtons = React.Children.map(buttonsElems, (child) => {
      if (!child) return null;
      return React.cloneElement(child, {
        onClick: (e) => {
          if (child.props.onClick) {
            child.props.onClick(e);
          }
          // Close dropdown after action
          setTimeout(closeDropdown, 100);
        },
      });
    });

    return (
      <div className="dropdown" ref={dropdownRef}>
        {enhancedTrigger}
        {isOpen && <div className={`dropdown-content ${type}`.trim()}>{enhancedButtons}</div>}
      </div>
    );
  }

  function PageCreate(props) {
    const { schema } = props;
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
    useLayoutEffect(() => {
      switch (viewMode) {
        case "edit":
          document.title = "Edit Navigation";
          break;
        case "create":
          document.title = "New Navigation";
          break;
        case "bookmark_import_chrome":
          document.title = "Import Chrome Bookmarks";
          break;
        case "bookmark_export_chrome":
          document.title = "Export Chrome Bookmarks";
          break;
        case "backup_download":
          document.title = "Backup Download";
          break;
      }
    }, [viewMode]);

    // render the proper views
    const allProps = { schema, onSetSchema, onSetViewMode };
    switch (viewMode) {
      case "read":
        return <PageRead {...allProps} />;
      case "edit":
        return <PageEdit {...allProps} />;
      case "create":
        return <PageCreate {...allProps} />;
      case "version_history":
        return <PageVersionHistory {...allProps} />;
      case "bookmark_import_chrome":
        return <PageChromeBookmarkImport {...allProps} />;
      case "bookmark_export_chrome":
        return <PageChromeBookmarkExport {...allProps} />;
      case "backup_download":
        return <PageBackupDownload {...allProps} />;
    }
  }

  function PageVersionHistory(props) {
    const { schema, onSetViewMode, onSetSchema } = props;

    const [versions, setVersions] = useState([]);
    const [selectedDate, setSelectedDate] = useState("");
    const [selectedValue, setSelectedValue] = useState("");

    // Load versions on mount
    useLayoutEffect(() => {
      let mounted = true;

      async function loadVersions() {
        try {
          const allVersions = await getVersions();
          if (mounted) {
            // sort newest first
            const sorted = allVersions.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            setVersions(sorted);
          }
        } catch (err) {
          console.error("Failed to load versions:", err);
        }
      }

      loadVersions();

      return () => {
        mounted = false;
      };
    }, []);

    // Update selected value when dropdown changes
    const handleSelectChange = (e) => {
      const date = e.target.value;
      setSelectedDate(date);

      const version = versions.find((v) => v.created_at === date);
      setSelectedValue(version ? version.value : "");
    };

    // Apply / Cancel handlers
    const handleApply = () => {
      if (selectedValue) {
        onSetSchema(selectedValue); // update schema
      }
      onSetViewMode("read");
    };

    const handleCancel = () => {
      onSetViewMode("read");
    };

    return (
      <div id="command" className="nav-version-history">
        <div className="title">
          Version History
          <div className="action-bar">
            <select value={selectedDate} onChange={handleSelectChange}>
              <option value="">Select a Version</option>
              {versions.map((v) => (
                <option key={v.created_at} value={v.created_at}>
                  {new Date(v.created_at).toLocaleString()}
                </option>
              ))}
            </select>
            <button id="applyEdit" type="button" role="button" onClick={() => handleApply()}>
              Apply
            </button>
            <button id="cancelEdit" type="button" role="button" onClick={() => handleCancel()}>
              Cancel
            </button>
          </div>
        </div>

        <SchemaEditor id="input" wrap="soft" spellcheck="false" value={selectedValue} readOnly={true}></SchemaEditor>
      </div>
    );
  }

  function parseNavGeneratorToChromeBookmark(schema) {
    // Safety check for empty schema
    if (!schema || typeof schema !== "string" || schema.trim().length === 0) {
      return "<!-- No bookmarks to export -->";
    }

    // Parse the schema to get structured data
    const serializedSchema = _getSerializedSchema(schema);

    // Filter for only title, header, and link types
    const relevantItems = serializedSchema.filter((item) => item.type === "title" || item.type === "header" || item.type === "link");

    if (relevantItems.length === 0) {
      return "<!-- No bookmarks to export -->";
    }

    // Find the title (page title)
    const titleItem = relevantItems.find((item) => item.type === "title");
    const pageTitle = titleItem ? titleItem.value : "Bookmarks";

    // Group links under headers
    const groups = [];
    let currentGroup = null;

    for (const item of relevantItems) {
      if (item.type === "header") {
        // Start a new group
        if (currentGroup && currentGroup.links.length > 0) {
          groups.push(currentGroup);
        }
        currentGroup = {
          name: item.value,
          links: [],
        };
      } else if (item.type === "link") {
        // Add link to current group or create default group
        if (!currentGroup) {
          currentGroup = {
            name: "Bookmarks",
            links: [],
          };
        }
        currentGroup.links.push({
          text: item.linkText,
          url: item.linkUrl,
        });
      }
    }

    // Don't forget the last group
    if (currentGroup && currentGroup.links.length > 0) {
      groups.push(currentGroup);
    }

    // Generate Chrome bookmark HTML
    const timestamp = Math.floor(Date.now() / 1000);
    let html = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<!-- This is an automatically generated file.
     It will be read and overwritten.
     DO NOT EDIT! -->
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>${pageTitle}</TITLE>
<H1>${pageTitle}</H1>
<DL><p>
`;

    // Add each group as a folder
    groups.forEach((group) => {
      html += `    <DT><H3 ADD_DATE="${timestamp}" LAST_MODIFIED="${timestamp}">${group.name}</H3>\n`;
      html += `    <DL><p>\n`;

      // Add links in this group
      group.links.forEach((link) => {
        html += `        <DT><A HREF="${link.url}" ADD_DATE="${timestamp}">${link.text}</A>\n`;
      });

      html += `    </DL><p>\n`;
    });

    html += `</DL><p>\n`;

    return html;
  }

  function PageChromeBookmarkImport(props) {
    const { schema, onSetViewMode, onSetSchema } = props;

    const [htmlInput, setHtmlInput] = useState("");

    // Helper function to parse Chrome bookmarks
    function parseChromeBookmarksFromHTML(htmlString) {
      try {
        // ---- Parse HTML string into DOM ----
        // Clean up common HTML issues from Chrome bookmarks
        let cleanedHtml = htmlString
          .replace(/<!--[\s\S]*?-->/g, "") // Remove HTML comments
          .replace(/<p>/gi, "") // Remove opening <p> tags
          .replace(/<\/p>/gi, ""); // Remove closing </p> tags

        const parser = new DOMParser();
        const doc = parser.parseFromString(cleanedHtml, "text/html");

        // Check for parse errors
        const parserError = doc.querySelector("parsererror");
        if (parserError) {
          console.warn("HTML parsing warning:", parserError.textContent);
          // Try to continue anyway - the DOM might still have usable content
        }

        // Find all top-level DL elements
        const allDLs = doc.querySelectorAll("DL");
        if (allDLs.length === 0) {
          console.error("No DL elements found in HTML");
          return "";
        }

        const rootDLs = Array.from(allDLs).filter((dl) => {
          // Find DLs that are not nested inside another DL
          let parent = dl.parentElement;
          while (parent && parent !== doc.body && parent !== doc.documentElement) {
            if (parent.tagName === "DL") {
              return false; // This DL is nested, skip it
            }
            parent = parent.parentElement;
          }
          return true; // This is a root DL
        });

        if (rootDLs.length === 0) {
          console.error("No root DL elements found");
          return "";
        }

        // Helper function to extract domain name from URL
        function getRootNameFromUrl(url) {
          try {
            // normalize missing protocol
            if (!/^https?:\/\//i.test(url)) {
              url = "http://" + url;
            }

            const u = new URL(url);
            let host = u.hostname.toLowerCase();

            // remove common subdomains
            host = host.replace(/^www\./, "");

            // extract base domain
            const parts = host.split(".");
            if (parts.length >= 2) {
              return parts[parts.length - 2]; // abc.com -> abc
            }

            return parts[0];
          } catch {
            return "link";
          }
        }

        // Recursive function to process DOM elements
        function processElement(element, path = []) {
          const results = [];
          const children = Array.from(element.children);
          const processedDLs = new Set(); // Track which DLs we've already processed

          for (let i = 0; i < children.length; i++) {
            const child = children[i];

            if (child.tagName === "DT") {
              // Check if this DT contains a folder (H3) or a link (A)
              const h3 = child.querySelector(":scope > H3");
              const a = child.querySelector(":scope > A");

              if (h3) {
                // This is a folder
                const folderName = h3.textContent.trim();
                const fullPath = [...path, folderName];

                // Add folder header
                results.push(`\n# ${fullPath.join(" > ")}`);

                // Look for the folder's content DL in two possible locations:
                // 1. As a child of this DT (browser may have moved it here during parsing)
                // 2. As the next sibling of this DT (Chrome's original format)

                let folderDL = null;

                // First, check if DL is a direct child of this DT
                const childDL = child.querySelector(":scope > DL");
                if (childDL) {
                  folderDL = childDL;
                } else {
                  // If not a child, look for it as a sibling
                  let nextSibling = child.nextElementSibling;
                  while (nextSibling) {
                    if (nextSibling.tagName === "DL") {
                      folderDL = nextSibling;
                      break;
                    }
                    if (nextSibling.tagName === "DT") {
                      // Hit another DT, no folder content found
                      break;
                    }
                    nextSibling = nextSibling.nextElementSibling;
                  }
                }

                // Process the folder's content DL if found
                if (folderDL) {
                  processedDLs.add(folderDL); // Mark as processed
                  const folderResults = processElement(folderDL, fullPath);
                  results.push(...folderResults);
                }
              } else if (a) {
                // This is a bookmark link
                const href = a.getAttribute("HREF") || a.href;
                const text = a.textContent?.trim();

                if (href) {
                  if (text && text.length > 0) {
                    results.push(`${text} | ${href}`);
                  } else {
                    const rootName = getRootNameFromUrl(href);
                    results.push(`${rootName} | ${href}`);
                  }
                }
              }
            } else if (child.tagName === "DL") {
              // Only process this DL if it wasn't already processed as folder content
              if (!processedDLs.has(child)) {
                const nestedResults = processElement(child, path);
                results.push(...nestedResults);
              }
            }
            // Ignore <p> tags and other elements
          }

          return results;
        }

        // Process all root DLs
        const allResults = [];
        rootDLs.forEach((rootDL) => {
          const results = processElement(rootDL, []);
          allResults.push(...results);
        });

        return allResults.join("\n").trim();
      } catch (error) {
        console.error("Error parsing Chrome bookmarks:", error);
        throw new Error("Failed to parse bookmarks: " + error.message);
      }
    }

    // Apply handler - parse HTML and update schema
    const handleApply = async () => {
      if (htmlInput.trim()) {
        try {
          const parsedSchema = parseChromeBookmarksFromHTML(htmlInput);
          if (parsedSchema && parsedSchema.length > 0) {
            createVersion(parsedSchema);
            onSetSchema(parsedSchema);
          } else {
            await alert("No bookmarks found. Please check the HTML format.");
            return;
          }
        } catch (error) {
          console.error("Error parsing bookmarks:", error);
          await alert("Error parsing bookmarks: " + error.message);
          return;
        }
      }
      onSetViewMode("read");
    };

    // Cancel handler
    const handleCancel = () => {
      onSetViewMode("read");
    };

    return (
      <div id="command" className="nav-chrome-bookmark-import">
        <div className="title">
          Import Chrome Bookmarks
          <div className="action-bar">
            <button id="applyEdit" type="button" role="button" onClick={() => handleApply()}>
              Apply
            </button>
            <button id="cancelEdit" type="button" role="button" onClick={() => handleCancel()}>
              Cancel
            </button>
          </div>
        </div>

        <SchemaEditor
          id="input"
          type="html"
          wrap="soft"
          spellcheck="false"
          value={htmlInput}
          onInput={(e) => setHtmlInput(e.target.value)}
        />
      </div>
    );
  }

  function PageChromeBookmarkExport(props) {
    const { schema, onSetViewMode } = props;

    const [htmlOutput, setHtmlOutput] = useState("");

    // Generate the Chrome bookmark HTML on mount
    useLayoutEffect(() => {
      const chromeBookmarkHtml = parseNavGeneratorToChromeBookmark(schema);
      setHtmlOutput(chromeBookmarkHtml);
    }, [schema]);

    // Download handler
    const handleDownload = () => {
      // Generate filename with timestamp
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const day = String(now.getDate()).padStart(2, "0");
      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      const seconds = String(now.getSeconds()).padStart(2, "0");
      const filename = `bookmark-${year}-${month}-${day}-${hours}-${minutes}-${seconds}.html`;

      // Create a blob and download link
      const blob = new Blob([htmlOutput], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Close the view
      onSetViewMode("read");
    };

    // Cancel handler
    const handleCancel = () => {
      onSetViewMode("read");
    };

    return (
      <div id="command" className="nav-chrome-bookmark-export">
        <div className="title">
          Export Chrome Bookmarks
          <div className="action-bar">
            <button id="downloadBookmark" type="button" role="button" onClick={() => handleDownload()}>
              Download
            </button>
            <button id="cancelExport" type="button" role="button" onClick={() => handleCancel()}>
              Cancel
            </button>
          </div>
        </div>

        <SchemaEditor id="output" type="html" wrap="soft" spellcheck="false" value={htmlOutput} readOnly={true} />
      </div>
    );
  }

  function PageBackupDownload(props) {
    const { schema, onSetViewMode } = props;

    // Download handler
    const handleDownload = () => {
      // Generate filename with timestamp
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const day = String(now.getDate()).padStart(2, "0");
      const filename = `nav-generator-${year}-${month}-${day}.md`;

      // Create a blob and download link
      const blob = new Blob([schema], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Close the view
      onSetViewMode("read");
    };

    // Cancel handler
    const handleCancel = () => {
      onSetViewMode("read");
    };

    return (
      <div id="command" className="nav-backup-download">
        <div className="title">
          Backup Download
          <div className="action-bar">
            <button id="downloadBackup" type="button" role="button" onClick={() => handleDownload()}>
              Download
            </button>
            <button id="cancelBackup" type="button" role="button" onClick={() => handleCancel()}>
              Cancel
            </button>
          </div>
        </div>

        <SchemaEditor id="backupOutput" type="text" wrap="soft" spellcheck="false" value={schema} readOnly={true} />
      </div>
    );
  }

  // initialization
  // hooking up extra meta data
  document.head.insertAdjacentHTML(
    "beforeend",
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
    "keydown",
    (e) => {
      // handling enter and spacebar on focusable div
      const { key } = e;
      const target = e.target;
      const focusedElement = document.activeElement;

      if (e.target.id === "search") {
        if (e.ctrlKey || e.metaKey || e.shiftKey) {
          if (e.key === "Enter") {
            // with alt enter, triggers google search
            location.href = `https://www.google.com/search?q=${encodeURIComponent(e.target.value)}`;
            return;
          }
        }
      }
      if (key === "Enter" || key === " ") {
        if (parseInt(target.tabIndex) === 0 && target.tagName !== "TEXTAREA" && target.tagName !== "INPUT" && target.tagName !== "SELECT") {
          _dispatchEvent(target, "click");

          e.preventDefault();
          e.stopPropagation();
          return;
        }
      } else if (key === "Escape") {
        if (document.querySelector("#input")) {
          if (document.querySelector("#input") === document.activeElement) {
            document.querySelector("#input").blur();
          }
        }
        if (document.querySelector("#search")) {
          const searchBox = document.querySelector("#search");
          if (searchBox === document.activeElement) {
            // Clear search text
            searchBox.value = "";
            searchBox.dispatchEvent(new Event("input", { bubbles: true }));
            searchBox.blur();
          }
        }
      } else if (
        document.querySelector("#search") &&
        document.querySelector("#search") !== focusedElement &&
        document.querySelectorAll(".modal").length === 0
      ) {
        // special handling to focus on searchbox
        const searchBox = document.querySelector("#search");

        switch (key) {
          case "f":
          case "?":
          case "/":
          case "t":
            if (!e.ctrlKey && !e.altKey && !e.metaKey) {
              searchBox.focus();
              e.preventDefault();
            }
            break;
          case "e":
          case "i":
            _dispatchEvent(document.querySelector("#edit"), "click");
            e.preventDefault();
            break;
          case "c":
            if (!e.ctrlKey && !e.altKey && !e.metaKey) {
              _dispatchEvent(document.querySelectorAll(".copyBookmarkToClipboard")[0], "click");
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
    "click",
    (e) => {
      const target = e.target;
      if (target.classList.contains("tab")) {
        const tab = target;
        const tabChildren = [...tab.parentElement.querySelectorAll("tab")];

        for (const targetTab of tabChildren) {
          const targetTabId = targetTab.dataset?.tabId;
          const contentEl = targetTabId ? document.getElementById(targetTabId) : null;

          if (tab === targetTab) {
            // Show and select target tab
            if (contentEl) {
              contentEl.style.display = "block";

              // If already selected, toggle expansion
              if (tab.classList.contains("selected")) {
                contentEl.classList.add("expanded");
              }
            }
            tab.classList.add("selected");
          } else {
            // Hide and deselect others
            if (contentEl) {
              contentEl.style.display = "none";
              contentEl.classList.remove("expanded"); // Optional: reset expansion on hide
            }
            targetTab.classList.remove("selected");
          }
        }
        e.preventDefault();
        e.stopPropagation();
      }
    },
    true,
  );

  document.addEventListener(
    "mousedown",
    (e) => {
      if (e.button == 1) {
        // middle click on button to trigger click
        const target = e.target;
        if (target.tagName === "BUTTON") {
          _dispatchEvent(target, "click");
          e.preventDefault();
        }
      }
    },
    true,
  );

  // Reserved for additional scripts/styles if needed
  await Promise.all([]);

  // find and parse the schema from script
  let inputSchema = document.querySelector("[type=schema]")?.innerText?.trim() || _getPersistedBufferSchema() || "";
  let viewMode = "read";

  document.innerHTML = `<div style="text-align: center; margin: 20px; font-size: 20px;">Loading...</div>`;

  if (document.querySelector("[type=schema]")) {
    // if schema tag is present let's render it as read
    _render(); // rerender the dom
  } else if (!window.hasCustomNavBeforeLoad) {
    if (location.search.includes("loadNav")) {
      // will wait for postmessage to populate this
      window.history.pushState("", "", APP_INDEX_URL);
      _setSessionValue("loadNavFromSessionStorage", "1");

      const _onHandlePostMessageEvent = (event) => {
        const { type } = event.data;
        const newSchema = event.data.schema;
        if (type === "onViewLinks") {
          try {
            _persistBufferSchema(newSchema);
            inputSchema = newSchema;
            _render(); // rerender the dom
          } catch (err) {}
        }
      };
      window.addEventListener("message", _onHandlePostMessageEvent);
    } else if (location.search.includes("newNav") || (!isRenderedInDataUrl && !location.href.includes("index.html"))) {
      // render as edit mode for newNav
      window.history.replaceState("", "", APP_INDEX_URL);
      _persistBufferSchema(DEFAULT_SCHEMA_TO_RENDER);
      _setSessionValue("loadNavFromSessionStorage", "1");

      inputSchema = DEFAULT_SCHEMA_TO_RENDER;
      viewMode = "edit";

      _render(); // rerender the dom
    } else if (_getSessionValue("loadNavFromSessionStorage") === "1" && location.href.includes(APP_INDEX_URL)) {
      // if this flag is set, then continue
      // will proceed with loading from session storage
      _render(); // rerender the dom
    }
  } else {
    // else if no schema script or anything other way then we need
    // to listen to the app
    document.addEventListener("DOMContentLoaded", () => {
      _dispatchCustomEvent(document, "NavBeforeLoad", {
        renderSchema: (newSchema) => {
          inputSchema = newSchema;
          _render();
        },
      });
    });
  }

  const THEME_KEY = "theme-mode";
  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
  }

  function setTheme(theme) {
    applyTheme(theme);
    _setLocalValue(THEME_KEY, theme);
  }

  function clearTheme() {
    document.documentElement.removeAttribute("data-theme");
    _setLocalValue(THEME_KEY, "");
  }

  function getInitialTheme() {
    try {
      return _getLocalValue(THEME_KEY);
    } catch (err) {
      return null;
    }
  }

  // Apply theme immediately on page load to prevent flash
  (function initTheme() {
    const savedTheme = getInitialTheme();
    if (savedTheme === "dark" || savedTheme === "light") {
      applyTheme(savedTheme);
    }
  })();

  function ThemeToggle() {
    const [theme, setThemeState] = useState(getInitialTheme);

    useLayoutEffect(() => {
      if (theme === "dark" || theme === "light") {
        setTheme(theme);
      } else {
        clearTheme();
      }
    }, [theme]);

    const toggleTheme = () => {
      setThemeState((prev) => (prev === "dark" ? "light" : "dark"));
    };

    return <button onClick={toggleTheme}>{theme === "dark" ? "Light Mode" : "Dark Mode"}</button>;
  }

  function VersionHistoryButton({ onSetViewMode }) {
    const [hasVersions, setHasVersions] = useState(false);

    useLayoutEffect(() => {
      let mounted = true;

      async function checkVersions() {
        try {
          const versions = await getVersions();
          if (mounted) {
            setHasVersions(versions.length > 0);
          }
        } catch (err) {
          console.error("Failed to check versions:", err);
        }
      }

      checkVersions();
    }, []);

    if (!hasVersions) return null;

    return (
      <button onClick={() => onSetViewMode("version_history")} type="button" role="button">
        Version History
      </button>
    );
  }

  // IndexedDB setup
  const DB_NAME = "VersionsDB";
  const STORE_NAME = "versions";
  const DB_VERSION = 1;

  let db;

  // Initialize IndexedDB
  function initDB() {
    return new Promise((resolve, reject) => {
      try {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = function (event) {
          db = event.target.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME, { keyPath: "created_at" });
          }
        };

        request.onsuccess = function (event) {
          db = event.target.result;
          resolve(db);
        };

        request.onerror = function (event) {
          console.error("IndexedDB error:", event.target.error);
          reject(event.target.error);
        };
      } catch (err) {
        console.error("Init DB failed:", err);
        reject(err);
      }
    });
  }

  // Add a version (trim, no duplicates)
  async function createVersion(value) {
    try {
      if (!db) await initDB();

      // Trim input
      const finalValue = value.trim();
      if (!finalValue) {
        console.log("Empty value, skipping insert.");
        return null;
      }

      // Check for duplicates
      const existingVersions = await getVersions();
      const isDuplicate = existingVersions.some((v) => v.value === finalValue);
      if (isDuplicate) {
        console.log("Duplicate value detected, skipping insert.");
        return null;
      }

      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);

        const version = {
          value: finalValue,
          created_at: new Date().toISOString(),
        };

        const request = store.add(version);

        request.onsuccess = () => resolve(version);
        request.onerror = (e) => {
          console.error("Add version failed:", e.target.error);
          reject(e.target.error);
        };
      });
    } catch (err) {
      console.error("createVersion failed:", err);
      throw err;
    }
  }

  // Get all versions
  async function getVersions() {
    try {
      if (!db) await initDB();

      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result);
        request.onerror = (e) => {
          console.error("Get versions failed:", e.target.error);
          reject(e.target.error);
        };
      });
    } catch (err) {
      console.error("getVersions failed:", err);
      throw err;
    }
  }

  function _render() {
    ReactDOM.render(
      React.createElement(App, {
        schema: inputSchema,
        viewMode: viewMode,
      }),
      document.body,
    );
  }
})();


console.log('Initializing Nav-Generator', new Date())
