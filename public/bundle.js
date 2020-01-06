var reasonRedom = (function (exports) {
  'use strict';

  function parseQuery (query) {
    var isId = false;
    var isClass = false;
    var tag = '';
    var id = '';
    var className = '';
    for (var i = 0; i < query.length; i++) {
      var char = query[i];
      if (char === '.') {
        isClass = true;
        isId = false;
        if (className.length > 0) {
          className += ' ';
        }
      } else if (char === '#') {
        isId = true;
        isClass = false;
      } else if (isId) {
        id += char;
      } else if (isClass) {
        className += char;
      } else {
        tag += char;
      }
    }

    return {
      tag: tag || 'div',
      id: id,
      className: className
    };
  }

  function createElement (query, ns) {
    var ref = parseQuery(query);
    var tag = ref.tag;
    var id = ref.id;
    var className = ref.className;
    var element = ns ? document.createElementNS(ns, tag) : document.createElement(tag);

    if (id) {
      element.id = id;
    }

    if (className) {
      if (ns) {
        element.setAttribute('class', className);
      } else {
        element.className = className;
      }
    }

    return element;
  }

  function unmount (parent, child) {
    var parentEl = getEl(parent);
    var childEl = getEl(child);

    if (child === childEl && childEl.__redom_view) {
      // try to look up the view if not provided
      child = childEl.__redom_view;
    }

    if (childEl.parentNode) {
      doUnmount(child, childEl, parentEl);

      parentEl.removeChild(childEl);
    }

    return child;
  }

  function doUnmount (child, childEl, parentEl) {
    var hooks = childEl.__redom_lifecycle;

    if (hooksAreEmpty(hooks)) {
      childEl.__redom_lifecycle = {};
      return;
    }

    var traverse = parentEl;

    if (childEl.__redom_mounted) {
      trigger(childEl, 'onunmount');
    }

    while (traverse) {
      var parentHooks = traverse.__redom_lifecycle || {};

      for (var hook in hooks) {
        if (parentHooks[hook]) {
          parentHooks[hook] -= hooks[hook];
        }
      }

      if (hooksAreEmpty(parentHooks)) {
        traverse.__redom_lifecycle = null;
      }

      traverse = traverse.parentNode;
    }
  }

  function hooksAreEmpty (hooks) {
    if (hooks == null) {
      return true;
    }
    for (var key in hooks) {
      if (hooks[key]) {
        return false;
      }
    }
    return true;
  }

  /* global Node, ShadowRoot */

  var hookNames = ['onmount', 'onremount', 'onunmount'];
  var shadowRootAvailable = typeof window !== 'undefined' && 'ShadowRoot' in window;

  function mount (parent, child, before, replace) {
    var parentEl = getEl(parent);
    var childEl = getEl(child);

    if (child === childEl && childEl.__redom_view) {
      // try to look up the view if not provided
      child = childEl.__redom_view;
    }

    if (child !== childEl) {
      childEl.__redom_view = child;
    }

    var wasMounted = childEl.__redom_mounted;
    var oldParent = childEl.parentNode;

    if (wasMounted && (oldParent !== parentEl)) {
      doUnmount(child, childEl, oldParent);
    }

    if (before != null) {
      if (replace) {
        parentEl.replaceChild(childEl, getEl(before));
      } else {
        parentEl.insertBefore(childEl, getEl(before));
      }
    } else {
      parentEl.appendChild(childEl);
    }

    doMount(child, childEl, parentEl, oldParent);

    return child;
  }

  function trigger (el, eventName) {
    if (eventName === 'onmount' || eventName === 'onremount') {
      el.__redom_mounted = true;
    } else if (eventName === 'onunmount') {
      el.__redom_mounted = false;
    }

    var hooks = el.__redom_lifecycle;

    if (!hooks) {
      return;
    }

    var view = el.__redom_view;
    var hookCount = 0;

    view && view[eventName] && view[eventName]();

    for (var hook in hooks) {
      if (hook) {
        hookCount++;
      }
    }

    if (hookCount) {
      var traverse = el.firstChild;

      while (traverse) {
        var next = traverse.nextSibling;

        trigger(traverse, eventName);

        traverse = next;
      }
    }
  }

  function doMount (child, childEl, parentEl, oldParent) {
    var hooks = childEl.__redom_lifecycle || (childEl.__redom_lifecycle = {});
    var remount = (parentEl === oldParent);
    var hooksFound = false;

    for (var i = 0, list = hookNames; i < list.length; i += 1) {
      var hookName = list[i];

      if (!remount) { // if already mounted, skip this phase
        if (child !== childEl) { // only Views can have lifecycle events
          if (hookName in child) {
            hooks[hookName] = (hooks[hookName] || 0) + 1;
          }
        }
      }
      if (hooks[hookName]) {
        hooksFound = true;
      }
    }

    if (!hooksFound) {
      childEl.__redom_lifecycle = {};
      return;
    }

    var traverse = parentEl;
    var triggered = false;

    if (remount || (traverse && traverse.__redom_mounted)) {
      trigger(childEl, remount ? 'onremount' : 'onmount');
      triggered = true;
    }

    while (traverse) {
      var parent = traverse.parentNode;
      var parentHooks = traverse.__redom_lifecycle || (traverse.__redom_lifecycle = {});

      for (var hook in hooks) {
        parentHooks[hook] = (parentHooks[hook] || 0) + hooks[hook];
      }

      if (triggered) {
        break;
      } else {
        if (traverse.nodeType === Node.DOCUMENT_NODE ||
          (shadowRootAvailable && (traverse instanceof ShadowRoot)) ||
          (parent && parent.__redom_mounted)
        ) {
          trigger(traverse, remount ? 'onremount' : 'onmount');
          triggered = true;
        }
        traverse = parent;
      }
    }
  }

  function setStyle (view, arg1, arg2) {
    var el = getEl(view);

    if (typeof arg1 === 'object') {
      for (var key in arg1) {
        setStyleValue(el, key, arg1[key]);
      }
    } else {
      setStyleValue(el, arg1, arg2);
    }
  }

  function setStyleValue (el, key, value) {
    if (value == null) {
      el.style[key] = '';
    } else {
      el.style[key] = value;
    }
  }

  /* global SVGElement */

  var xlinkns = 'http://www.w3.org/1999/xlink';

  function setAttr (view, arg1, arg2) {
    setAttrInternal(view, arg1, arg2);
  }

  function setAttrInternal (view, arg1, arg2, initial) {
    var el = getEl(view);

    var isObj = typeof arg1 === 'object';

    if (isObj) {
      for (var key in arg1) {
        setAttrInternal(el, key, arg1[key], initial);
      }
    } else {
      var isSVG = el instanceof SVGElement;
      var isFunc = typeof arg2 === 'function';

      if (arg1 === 'style' && typeof arg2 === 'object') {
        setStyle(el, arg2);
      } else if (isSVG && isFunc) {
        el[arg1] = arg2;
      } else if (arg1 === 'dataset') {
        setData(el, arg2);
      } else if (!isSVG && (arg1 in el || isFunc) && (arg1 !== 'list')) {
        el[arg1] = arg2;
      } else {
        if (isSVG && (arg1 === 'xlink')) {
          setXlink(el, arg2);
          return;
        }
        if (initial && arg1 === 'class') {
          arg2 = el.className + ' ' + arg2;
        }
        if (arg2 == null) {
          el.removeAttribute(arg1);
        } else {
          el.setAttribute(arg1, arg2);
        }
      }
    }
  }

  function setXlink (el, arg1, arg2) {
    if (typeof arg1 === 'object') {
      for (var key in arg1) {
        setXlink(el, key, arg1[key]);
      }
    } else {
      if (arg2 != null) {
        el.setAttributeNS(xlinkns, arg1, arg2);
      } else {
        el.removeAttributeNS(xlinkns, arg1, arg2);
      }
    }
  }

  function setData (el, arg1, arg2) {
    if (typeof arg1 === 'object') {
      for (var key in arg1) {
        setData(el, key, arg1[key]);
      }
    } else {
      if (arg2 != null) {
        el.dataset[arg1] = arg2;
      } else {
        delete el.dataset[arg1];
      }
    }
  }

  function text (str) {
    return document.createTextNode((str != null) ? str : '');
  }

  function parseArgumentsInternal (element, args, initial) {
    for (var i = 0, list = args; i < list.length; i += 1) {
      var arg = list[i];

      if (arg !== 0 && !arg) {
        continue;
      }

      var type = typeof arg;

      if (type === 'function') {
        arg(element);
      } else if (type === 'string' || type === 'number') {
        element.appendChild(text(arg));
      } else if (isNode(getEl(arg))) {
        mount(element, arg);
      } else if (arg.length) {
        parseArgumentsInternal(element, arg, initial);
      } else if (type === 'object') {
        setAttrInternal(element, arg, null, initial);
      }
    }
  }

  function ensureEl (parent) {
    return typeof parent === 'string' ? html(parent) : getEl(parent);
  }

  function getEl (parent) {
    return (parent.nodeType && parent) || (!parent.el && parent) || getEl(parent.el);
  }

  function isNode (arg) {
    return arg && arg.nodeType;
  }

  var htmlCache = {};

  function html (query) {
    var args = [], len = arguments.length - 1;
    while ( len-- > 0 ) args[ len ] = arguments[ len + 1 ];

    var element;

    var type = typeof query;

    if (type === 'string') {
      element = memoizeHTML(query).cloneNode(false);
    } else if (isNode(query)) {
      element = query.cloneNode(false);
    } else if (type === 'function') {
      var Query = query;
      element = new (Function.prototype.bind.apply( Query, [ null ].concat( args) ));
    } else {
      throw new Error('At least one argument required');
    }

    parseArgumentsInternal(getEl(element), args, true);

    return element;
  }

  var el = html;
  var h = html;

  html.extend = function extendHtml (query) {
    var args = [], len = arguments.length - 1;
    while ( len-- > 0 ) args[ len ] = arguments[ len + 1 ];

    var clone = memoizeHTML(query);

    return html.bind.apply(html, [ this, clone ].concat( args ));
  };

  function memoizeHTML (query) {
    return htmlCache[query] || (htmlCache[query] = createElement(query));
  }

  function setChildren (parent) {
    var children = [], len = arguments.length - 1;
    while ( len-- > 0 ) children[ len ] = arguments[ len + 1 ];

    var parentEl = getEl(parent);
    var current = traverse(parent, children, parentEl.firstChild);

    while (current) {
      var next = current.nextSibling;

      unmount(parent, current);

      current = next;
    }
  }

  function traverse (parent, children, _current) {
    var current = _current;

    var childEls = new Array(children.length);

    for (var i = 0; i < children.length; i++) {
      childEls[i] = children[i] && getEl(children[i]);
    }

    for (var i$1 = 0; i$1 < children.length; i$1++) {
      var child = children[i$1];

      if (!child) {
        continue;
      }

      var childEl = childEls[i$1];

      if (childEl === current) {
        current = current.nextSibling;
        continue;
      }

      if (isNode(childEl)) {
        var next = current && current.nextSibling;
        var exists = child.__redom_index != null;
        var replace = exists && next === childEls[i$1 + 1];

        mount(parent, child, current, replace);

        if (replace) {
          current = next;
        }

        continue;
      }

      if (child.length != null) {
        current = traverse(parent, child, current);
      }
    }

    return current;
  }

  function listPool (View, key, initData) {
    return new ListPool(View, key, initData);
  }

  var ListPool = function ListPool (View, key, initData) {
    this.View = View;
    this.initData = initData;
    this.oldLookup = {};
    this.lookup = {};
    this.oldViews = [];
    this.views = [];

    if (key != null) {
      this.key = typeof key === 'function' ? key : propKey(key);
    }
  };
  ListPool.prototype.update = function update (data, context) {
    var ref = this;
      var View = ref.View;
      var key = ref.key;
      var initData = ref.initData;
    var keySet = key != null;

    var oldLookup = this.lookup;
    var newLookup = {};

    var newViews = new Array(data.length);
    var oldViews = this.views;

    for (var i = 0; i < data.length; i++) {
      var item = data[i];
      var view = (void 0);

      if (keySet) {
        var id = key(item);

        view = oldLookup[id] || new View(initData, item, i, data);
        newLookup[id] = view;
        view.__redom_id = id;
      } else {
        view = oldViews[i] || new View(initData, item, i, data);
      }
      view.update && view.update(item, i, data, context);

      var el = getEl(view.el);

      el.__redom_view = view;
      newViews[i] = view;
    }

    this.oldViews = oldViews;
    this.views = newViews;

    this.oldLookup = oldLookup;
    this.lookup = newLookup;
  };

  function propKey (key) {
    return function (item) {
      return item[key];
    };
  }

  function list (parent, View, key, initData) {
    return new List(parent, View, key, initData);
  }

  var List = function List (parent, View, key, initData) {
    this.__redom_list = true;
    this.View = View;
    this.initData = initData;
    this.views = [];
    this.pool = new ListPool(View, key, initData);
    this.el = ensureEl(parent);
    this.keySet = key != null;
  };
  List.prototype.update = function update (data, context) {
      if ( data === void 0 ) data = [];

    var ref = this;
      var keySet = ref.keySet;
    var oldViews = this.views;

    this.pool.update(data, context);

    var ref$1 = this.pool;
      var views = ref$1.views;
      var lookup = ref$1.lookup;

    if (keySet) {
      for (var i = 0; i < oldViews.length; i++) {
        var oldView = oldViews[i];
        var id = oldView.__redom_id;

        if (lookup[id] == null) {
          oldView.__redom_index = null;
          unmount(this, oldView);
        }
      }
    }

    for (var i$1 = 0; i$1 < views.length; i$1++) {
      var view = views[i$1];

      view.__redom_index = i$1;
    }

    setChildren(this, views);

    if (keySet) {
      this.lookup = lookup;
    }
    this.views = views;
  };

  List.extend = function extendList (parent, View, key, initData) {
    return List.bind(List, parent, View, key, initData);
  };

  list.extend = List.extend;

  /* global Node */

  function place (View, initData) {
    return new Place(View, initData);
  }

  var Place = function Place (View, initData) {
    this.el = text('');
    this.visible = false;
    this.view = null;
    this._placeholder = this.el;

    if (View instanceof Node) {
      this._el = View;
    } else if (View.el instanceof Node) {
      this._el = View;
      this.view = View;
    } else {
      this._View = View;
    }

    this._initData = initData;
  };
  Place.prototype.update = function update (visible, data) {
    var placeholder = this._placeholder;
    var parentNode = this.el.parentNode;

    if (visible) {
      if (!this.visible) {
        if (this._el) {
          mount(parentNode, this._el, placeholder);
          unmount(parentNode, placeholder);

          this.el = getEl(this._el);
          this.visible = visible;
        } else {
          var View = this._View;
          var view = new View(this._initData);

          this.el = getEl(view);
          this.view = view;

          mount(parentNode, view, placeholder);
          unmount(parentNode, placeholder);
        }
      }
      this.view && this.view.update && this.view.update(data);
    } else {
      if (this.visible) {
        if (this._el) {
          mount(parentNode, placeholder, this._el);
          unmount(parentNode, this._el);

          this.el = placeholder;
          this.visible = visible;

          return;
        }
        mount(parentNode, placeholder, this.view);
        unmount(parentNode, this.view);

        this.el = placeholder;
        this.view = null;
      }
    }
    this.visible = visible;
  };

  /* global Node */

  function router (parent, Views, initData) {
    return new Router(parent, Views, initData);
  }

  var Router = function Router (parent, Views, initData) {
    this.el = ensureEl(parent);
    this.Views = Views;
    this.initData = initData;
  };
  Router.prototype.update = function update (route, data) {
    if (route !== this.route) {
      var Views = this.Views;
      var View = Views[route];

      this.route = route;

      if (View && (View instanceof Node || View.el instanceof Node)) {
        this.view = View;
      } else {
        this.view = View && new View(this.initData, data);
      }

      setChildren(this.el, [ this.view ]);
    }
    this.view && this.view.update && this.view.update(data, route);
  };

  var ns = 'http://www.w3.org/2000/svg';

  var svgCache = {};

  function svg (query) {
    var args = [], len = arguments.length - 1;
    while ( len-- > 0 ) args[ len ] = arguments[ len + 1 ];

    var element;

    var type = typeof query;

    if (type === 'string') {
      element = memoizeSVG(query).cloneNode(false);
    } else if (isNode(query)) {
      element = query.cloneNode(false);
    } else if (type === 'function') {
      var Query = query;
      element = new (Function.prototype.bind.apply( Query, [ null ].concat( args) ));
    } else {
      throw new Error('At least one argument required');
    }

    parseArgumentsInternal(getEl(element), args, true);

    return element;
  }

  var s = svg;

  svg.extend = function extendSvg (query) {
    var clone = memoizeSVG(query);

    return svg.bind(this, clone);
  };

  svg.ns = ns;

  function memoizeSVG (query) {
    return svgCache[query] || (svgCache[query] = createElement(query, ns));
  }

  var redom_es = /*#__PURE__*/Object.freeze({
    List: List,
    ListPool: ListPool,
    Place: Place,
    Router: Router,
    el: el,
    h: h,
    html: html,
    list: list,
    listPool: listPool,
    mount: mount,
    place: place,
    router: router,
    s: s,
    setAttr: setAttr,
    setChildren: setChildren,
    setData: setData,
    setStyle: setStyle,
    setXlink: setXlink,
    svg: svg,
    text: text,
    unmount: unmount
  });

  var undefinedHeader = /* array */[];

  function some(x) {
    if (x === undefined) {
      var block = /* tuple */[
        undefinedHeader,
        0
      ];
      block.tag = 256;
      return block;
    } else if (x !== null && x[0] === undefinedHeader) {
      var nid = x[1] + 1 | 0;
      var block$1 = /* tuple */[
        undefinedHeader,
        nid
      ];
      block$1.tag = 256;
      return block$1;
    } else {
      return x;
    }
  }

  function nullable_to_opt(x) {
    if (x === null || x === undefined) {
      return undefined;
    } else {
      return some(x);
    }
  }

  function undefined_to_opt(x) {
    if (x === undefined) {
      return undefined;
    } else {
      return some(x);
    }
  }

  function null_to_opt(x) {
    if (x === null) {
      return undefined;
    } else {
      return some(x);
    }
  }

  function valFromOption(x) {
    if (x !== null && x[0] === undefinedHeader) {
      var depth = x[1];
      if (depth === 0) {
        return undefined;
      } else {
        return /* tuple */[
                undefinedHeader,
                depth - 1 | 0
              ];
      }
    } else {
      return x;
    }
  }

  function option_get(x) {
    if (x === undefined) {
      return undefined;
    } else {
      return valFromOption(x);
    }
  }

  function option_get_unwrap(x) {
    if (x === undefined) {
      return undefined;
    } else {
      return valFromOption(x)[1];
    }
  }

  var nullable_to_opt_1 = nullable_to_opt;
  var undefined_to_opt_1 = undefined_to_opt;
  var null_to_opt_1 = null_to_opt;
  var valFromOption_1 = valFromOption;
  var some_1 = some;
  var option_get_1 = option_get;
  var option_get_unwrap_1 = option_get_unwrap;
  /* No side effect */

  var caml_option = {
  	nullable_to_opt: nullable_to_opt_1,
  	undefined_to_opt: undefined_to_opt_1,
  	null_to_opt: null_to_opt_1,
  	valFromOption: valFromOption_1,
  	some: some_1,
  	option_get: option_get_1,
  	option_get_unwrap: option_get_unwrap_1
  };

  var ReasonRedom = /* module */[];

  var stateInstance = {
    age: 45
  };

  var child = redom_es.el("div", undefined, String(stateInstance.age));

  child.addEventListener("build", (function ($$event) {
          child.textContent = $$event.detail;
          console.log($$event.detail);
          return /* () */0;
        }), false);

  function onClickHandler(param) {
    var currentAge = stateInstance.age;
    stateInstance.age = currentAge + 1 | 0;
    var updateTextEvent = new CustomEvent("build", {
          detail: String(stateInstance.age)
        });
    child.dispatchEvent(updateTextEvent);
    return /* () */0;
  }

  var elmentToRender = redom_es.el("button", {
        "data-id": 5,
        onclick: onClickHandler
      }, /* array */[
        "Hello World",
        child
      ]);

  function component(param) {
    return elmentToRender;
  }

  var HelloComponent = /* module */[
    /* stateInstance */stateInstance,
    /* child */child,
    /* onClickHandler */onClickHandler,
    /* elmentToRender */elmentToRender,
    /* component */component
  ];

  redom_es.mount(caml_option.nullable_to_opt(document.getElementById("root")), elmentToRender);

  var myDiv = /* () */0;

  var ReasonRedom_1 = ReasonRedom;
  var HelloComponent_1 = HelloComponent;
  var myDiv_1 = myDiv;
  /* child Not a pure module */

  var Redom_bs = {
  	ReasonRedom: ReasonRedom_1,
  	HelloComponent: HelloComponent_1,
  	myDiv: myDiv_1
  };

  exports.HelloComponent = HelloComponent_1;
  exports.ReasonRedom = ReasonRedom_1;
  exports.default = Redom_bs;
  exports.myDiv = myDiv_1;

  return exports;

}({}));
