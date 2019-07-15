module ReasonRedom = {
    type elm;
    type node;
    external array: array(elm) => elm = "%identity";
    external toString: string => elm = "%identity";
    [@bs.val] [@bs.return nullable] [@bs.scope "document"]
    external getElementById: string => option(node) = "getElementById";

    [@bs.val][@bs.module "redom"] [@bs.variadic]
    external el : (string, 'props,array(elm)) => elm = "el";

    [@bs.val][@bs.module "redom"]
    external mount:(option(node),elm) => unit = "mount";
};

module HelloComponent = {

    let onClickHandler = (event) => {
        Js.log(event);
    }

    let component =  ReasonRedom.el("div",{"data-id":5 ,"onclick":onClickHandler},[|ReasonRedom.toString("Hello World")|]);
}

let myDiv = 
ReasonRedom.mount(ReasonRedom.getElementById("root"),HelloComponent.component);
