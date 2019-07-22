module ReasonRedom = {
  type elm;
  type node;
  external arrayToElement: array(elm) => elm = "%identity";
  external stringToElement: string => elm = "%identity";
  [@bs.val] [@bs.return nullable] [@bs.scope "document"]
  external getElementById: string => option(node) = "getElementById";

  [@bs.val] [@bs.module "redom"]
  external el: (string, 'props, elm) => elm = "el";

  [@bs.val] [@bs.module "redom"]
  external mount: (option(node), elm) => unit = "mount";
};

module HelloComponent = {
  let onClickHandler = event => Js.log(event);

  let component =
    ReasonRedom.el(
      "div",
      {"data-id": 5, "onclick": onClickHandler},
      ReasonRedom.arrayToElement([|
        ReasonRedom.stringToElement("Hello World"),
        ReasonRedom.el("span", None, ReasonRedom.stringToElement("senthil")),
      |]),
    );
};

let myDiv =
  ReasonRedom.mount(
    ReasonRedom.getElementById("root"),
    HelloComponent.component,
  );
