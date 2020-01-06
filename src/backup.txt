module MDom = {
  type vnode;
  [@bs.get] external attrs: unit => Js.t({..}) = "attrs";
};

module MComponent = {
  type t;

  type self('vnode) = {vnode: 'vnode}
  and componentSpec('vnode) = {
    view: self('vnode) => MDom.vnode,
    oninit: self('vnode) => unit,
    oncreate: self('vnode) => unit,
    onupdate: self('vnode) => unit,
    onremove: self('vnode) => unit,
    onbeforeupdate: self('vnode) => bool,
  };
};

module ReasonMithril = {
  type node;
  type component;

  /**
   * conversion of certain typeof nodes to vnodes
   */
  external children: array(MDom.vnode) => MDom.vnode = "%identity";

  external str_to_vnode: string => MDom.vnode = "%identity";

  /**
   * get document element by id
   */
  [@bs.val] [@bs.return nullable] [@bs.scope "document"]
  external getElementById: string => option(node) = "getElementById";

  /**
   * Bind m of mithril
   */
  [@bs.module "mithril"]
  external m: (string, 'props, MDom.vnode) => MDom.vnode = "";

  /**
   * Bind render of mithril
   */
  [@bs.module "mithril"]
  external render: (option(node), MDom.vnode) => unit = "render";
};

module MEvent = {
  [@bs.get] external bubbles: Dom.event => bool = "bubbles";
  [@bs.get] external cancelable: Dom.event => bool = "cancelable";
  [@bs.get] external currentTarget: Dom.event => Js.t({..}) = "currentTarget"; /* Should return Dom.eventTarget */
  [@bs.get] external defaultPrevented: Dom.event => bool = "defaultPrevented";
  [@bs.get] external eventPhase: Dom.event => int = "eventPhase";
  [@bs.get] external isTrusted: Dom.event => bool = "isTrusted";
  [@bs.get] external nativeEvent: Dom.event => Js.t({..}) = "nativeEvent"; /* Should return Dom.event */
  [@bs.send] external preventDefault: Dom.event => unit = "preventDefault";
  [@bs.send]
  external isDefaultPrevented: Dom.event => bool = "isDefaultPrevented";
  [@bs.send] external stopPropagation: Dom.event => unit = "stopPropagation";
  [@bs.send]
  external isPropagationStopped: Dom.event => bool = "isPropagationStopped";
  [@bs.get] external target: Dom.event => Js.t({..}) = "target"; /* Should return Dom.eventTarget */
  [@bs.get] external timeStamp: Dom.event => float = "timeStamp";
  [@bs.get] external srcElement: Dom.event => Js.t({..}) = "srcElement"; /* Should return Dom.eventTarget */
};

module HelloComponent = {
  let onClickHandler = event => Js.log(event->MEvent.srcElement);

  [@bs.deriving abstract]
  type data = {
    [@bs.optional] [@bs.as "type"]
    type_: string,
    [@bs.optional] [@bs.as "aria-label"]
    ariaLabel: string,
    onclick: Dom.event => unit,
  };

  let props =
    data(
      ~type_="message",
      ~ariaLabel="hello inaria",
      ~onclick=onClickHandler,
      (),
    );

  let component =
    ReasonMithril.m(
      "div",
      props,
      ReasonMithril.children([|
        ReasonMithril.str_to_vnode("Hello World from mithril"),
        ReasonMithril.m(
          "span",
          None,
          ReasonMithril.str_to_vnode("senthil- Mithril bindings"),
        ),
      |]),
    );

  Js.log(component);
};

let myDiv =
  ReasonMithril.render(
    ReasonMithril.getElementById("root"),
    HelloComponent.component,
  );
