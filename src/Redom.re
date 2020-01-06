module ReasonRedom = {
  type nEvent;
  [@bs.new] external nativeEvent: (string, 'detail) => nEvent = "CustomEvent";

  [@bs.deriving abstract]
  type elm = {mutable textContent: string};
  [@bs.send]
  external addEventListener: (elm, string, 'p => unit, bool) => unit =
    "addEventListener";
  [@bs.send]
  external dispatchEvent: (elm, 'nativeEvent) => unit = "dispatchEvent";

  external getElem: elm => Js.t({..}) = "%identity";

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
  open ReasonRedom;

  [@bs.deriving abstract]
  type myState = {mutable age: int};

  let stateInstance = myState(~age=45);

  let child =
    el("div", None, stringToElement(string_of_int(stateInstance->ageGet)));

  addEventListener(
    child,
    "build",
    event => {
      child->textContentSet(event##detail);
      Js.log(event##detail);
    },
    false,
  );

  let onClickHandler = _ => {
    let currentAge = stateInstance->ageGet;
    stateInstance->ageSet(currentAge + 1);
    let updateTextEvent: nEvent =
      nativeEvent(
        "build",
        {"detail": string_of_int(stateInstance->ageGet)},
      );
    dispatchEvent(child, updateTextEvent);
  };

  let elmentToRender =
    el(
      "button",
      {"data-id": 5, "onclick": onClickHandler},
      arrayToElement([|stringToElement("Hello World"), child|]),
    );

  let component = () => {
    elmentToRender;
  };
};

let myDiv =
  ReasonRedom.mount(
    ReasonRedom.getElementById("root"),
    HelloComponent.elmentToRender,
  );