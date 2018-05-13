import React from "dist/React";
import ReactDOMServer from "dist/ReactDOMServer";

import ReactTestUtils from "lib/ReactTestUtils";
var ReactDOM = window.ReactDOM || React;
function normalizeCodeLocInfo(str) {
    return str && str.replace(/\(at .+?:\d+\)/g, "(at **)");
}
function spyOnDev() {}
var __DEV__ = false;
function dispatchEventOnNode(node, type) {
    node.dispatchEvent(new Event(type, { bubbles: true, cancelable: true }));
}
function emptyFunction() {}
var setUntrackedValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;

describe("ReactDOMInput", function() {
    function getTestInput() {
        return class extends React.Component {
            state = {
                value: this.props.value == null ? "" : this.props.value
            };
            onChange = event => {
                this.setState({ value: event.target.value });
            };
            render() {
                const type = this.props.type;
                const value = this.state.value;

                return <input type={type} value={value} onChange={this.onChange} />;
            }
        };
    }
    this.timeout(200000);
    //受控组件分成两种，完整的受控组件与残缺的受控组件，它们都产生一个 顽固的内部 值
    it("should properly control a value even if no event listener exists", () => {
        var container = document.createElement("div");
        var stub = ReactDOM.render(<input type="text" value="lion" />, container);

        document.body.appendChild(container);

        var node = ReactDOM.findDOMNode(stub);

        setUntrackedValue.call(node, "giraffe");

        // This must use the native event dispatching. If we simulate, we will
        // bypass the lazy event attachment system so we won't actually test this.
        dispatchEventOnNode(node, "change");

        expect(node.value).toBe("lion");

        document.body.removeChild(container);
    });

    it("should control a value in reentrant events", () => {
        class ControlledInputs extends React.Component {
            state = { value: "lion" };
            a = null;
            b = null;
            switchedFocus = false;
            change(newValue) {
                this.setState({ value: newValue });
                // Calling focus here will blur the text box which causes a native
                // change event. Ideally we shouldn't have to fire this ourselves.
                // Don't remove unless you've verified the fix in #8240 is still covered.
                dispatchEventOnNode(this.a, "change");
                this.b.focus();
            }
            blur(currentValue) {
                this.switchedFocus = true;
                // currentValue should be 'giraffe' here because we should not have
                // restored it on the target yet.
                this.setState({ value: currentValue });
            }
            render() {
                return (
                    <div>
                        <input type="text" ref={n => (this.a = n)} value={this.state.value} onChange={e => this.change(e.target.value)} onBlur={e => this.blur(e.target.value)} />
                        <input type="text" ref={n => (this.b = n)} />
                    </div>
                );
            }
        }

        var container = document.createElement("div");
        var instance = ReactDOM.render(<ControlledInputs />, container);

        // We need it to be in the body to test native event dispatching.
        document.body.appendChild(container);

        // Focus the field so we can later blur it.
        // Don't remove unless you've verified the fix in #8240 is still covered.
        instance.a.focus();
        setUntrackedValue.call(instance.a, "giraffe");
        // This must use the native event dispatching. If we simulate, we will
        // bypass the lazy event attachment system so we won't actually test this.
        dispatchEventOnNode(instance.a, "change");
        dispatchEventOnNode(instance.a, "blur");

        expect(instance.a.value).toBe("giraffe");
        expect(instance.switchedFocus).toBe(true);

        document.body.removeChild(container);
    });
    it("should control values in reentrant events with different targets", () => {
        class ControlledInputs extends React.Component {
            state = { value: "lion" };
            a = null;
            b = null;
            change(newValue) {
                // This click will change the checkbox's value to false. Then it will
                // invoke an inner change event. When we finally, flush, we need to
                // reset the checkbox's value to true since that is its controlled
                // value.
                this.b.click();
            }
            render() {
                return (
                    <div>
                        <input type="text" ref={n => (this.a = n)} value="lion" onChange={e => this.change(e.target.value)} />
                        <input type="checkbox" ref={n => (this.b = n)} checked={true} onChange={() => {}} />
                    </div>
                );
            }
        }

        var container = document.createElement("div");
        var instance = ReactDOM.render(<ControlledInputs />, container);

        // We need it to be in the body to test native event dispatching.
        document.body.appendChild(container);

        setUntrackedValue.call(instance.a, "giraffe");
        // This must use the native event dispatching. If we simulate, we will
        // bypass the lazy event attachment system so we won't actually test this.
        dispatchEventOnNode(instance.a, "input");

        expect(instance.a.value).toBe("lion");
        expect(instance.b.checked).toBe(true);

        document.body.removeChild(container);
    });

    it('does change the number 2 to "2.0" with no change handler', () => {
        var stub = <input type="text" value={2} onChange={null} />;
        stub = ReactTestUtils.renderIntoDocument(stub);
        var node = ReactDOM.findDOMNode(stub);

        node.value = "2.0";

        ReactTestUtils.Simulate.change(stub);

        expect(node.getAttribute("value")).toBe("2");
        expect(node.value).toBe("2");
    });

    it('does change the string "2" to "2.0" with no change handler', () => {
        var stub = <input type="text" value={"2"} onChange={null} />;
        stub = ReactTestUtils.renderIntoDocument(stub);
        var node = ReactDOM.findDOMNode(stub);

        node.value = "2.0";

        ReactTestUtils.Simulate.change(stub);

        expect(node.getAttribute("value")).toBe("2");
        expect(node.value).toBe("2");
    });

    it('changes the number 2 to "2.0" using a change handler', () => {
        class Stub extends React.Component {
            state = {
                value: 2
            };
            onChange = event => {
                this.setState({ value: event.target.value });
            };
            render() {
                var { value } = this.state;

                return <input type="text" value={value} onChange={this.onChange} />;
            }
        }

        var stub = ReactTestUtils.renderIntoDocument(<Stub />);
        var node = ReactDOM.findDOMNode(stub);

        node.value = "2.0";

        ReactTestUtils.Simulate.change(node);

        expect(node.getAttribute("value")).toBe("2.0");
        expect(node.value).toBe("2.0");
    });

    it('does change the string ".98" to "0.98" with no change handler', () => {
        class Stub extends React.Component {
            state = {
                value: ".98"
            };
            render() {
                return <input type="number" value={this.state.value} />;
            }
        }

        var stub = ReactTestUtils.renderIntoDocument(<Stub />);
        var node = ReactDOM.findDOMNode(stub);
        stub.setState({ value: "0.98" });

        expect(node.value).toEqual("0.98");
    });

    it('performs a state change from "" to 0', () => {
        class Stub extends React.Component {
            state = {
                value: ""
            };
            render() {
                return <input type="number" value={this.state.value} readOnly={true} />;
            }
        }

        var stub = ReactTestUtils.renderIntoDocument(<Stub />);
        var node = ReactDOM.findDOMNode(stub);
        stub.setState({ value: 0 });

        expect(node.value).toEqual("0");
    });

    it("distinguishes precision for extra zeroes in string number values", () => {
        class Stub extends React.Component {
            state = {
                value: "3.0000"
            };
            render() {
                return <input type="number" value={this.state.value} />;
            }
        }

        var stub = ReactTestUtils.renderIntoDocument(<Stub />);
        var node = ReactDOM.findDOMNode(stub);
        stub.setState({ value: "3" });

        expect(node.value).toEqual("3");
    });

    it("should display `defaultValue` of number 0", () => {
        var stub = <input type="text" defaultValue={0} />;
        stub = ReactTestUtils.renderIntoDocument(stub);
        var node = ReactDOM.findDOMNode(stub);

        expect(node.getAttribute("value")).toBe("0");
        expect(node.value).toBe("0");
    });

    it("only assigns defaultValue if it changes", () => {
        class Test extends React.Component {
            render() {
                return <input defaultValue="0" />;
            }
        }

        var component = ReactTestUtils.renderIntoDocument(<Test />);
        var node = ReactDOM.findDOMNode(component);

        Object.defineProperty(node, "defaultValue", {
            get() {
                return "0";
            },
            set(value) {
                throw new Error(`defaultValue was assigned ${value}, but it did not change!`);
            }
        });

        component.forceUpdate();
    });

    it('should display "true" for `defaultValue` of `true`', () => {
        var stub = <input type="text" defaultValue={true} />;
        stub = ReactTestUtils.renderIntoDocument(stub);
        var node = ReactDOM.findDOMNode(stub);

        expect(node.value).toBe("true");
    });

    it('should display "false" for `defaultValue` of `false`', () => {
        var stub = <input type="text" defaultValue={false} />;
        stub = ReactTestUtils.renderIntoDocument(stub);
        var node = ReactDOM.findDOMNode(stub);

        expect(node.value).toBe("false");
    });

    it("should update `defaultValue` for uncontrolled input", () => {
        // input元素的value/defaultValue 都会产生一个value的特性
        var container = document.createElement("div");

        var node = ReactDOM.render(<input type="text" defaultValue="0" />, container);

        expect(node.value).toBe("0");

        ReactDOM.render(<input type="text" defaultValue="1" />, container);

        expect(node.value).toBe("0");
        expect(node.defaultValue).toBe("1");
    });

    it("should update `defaultValue` for uncontrolled date/time input", () => {
        var container = document.createElement("div");

        var node = ReactDOM.render(<input type="date" defaultValue="1980-01-01" />, container);

        expect(node.value).toBe("1980-01-01");

        ReactDOM.render(<input type="date" defaultValue="2000-01-01" />, container);

        expect(node.value).toBe("1980-01-01");
        expect(node.defaultValue).toBe("2000-01-01");

        ReactDOM.render(<input type="date" />, container);
    });

    it("should take `defaultValue` when changing to uncontrolled input", () => {
        //当受控组件转换为非受控组件时，其内部的顽固值 依然生效，不被串改
        var container = document.createElement("div");
        var node = ReactDOM.render(<input type="text" value="0" readOnly="true" />, container);
        expect(node.value).toBe("0");
        ReactDOM.render(<input type="text" defaultValue="1" />, container);
        expect(node.value).toBe("0");
    });

    it("should render defaultValue for SSR", () => {
        var markup = ReactDOMServer.renderToString(<input type="text" defaultValue="1" />);
        var div = document.createElement("div");
        div.innerHTML = markup;
        expect(div.firstChild.getAttribute("value")).toBe("1");
        expect(div.firstChild.getAttribute("defaultValue")).toBe(null);
    });

    it("should render value for SSR", () => {
        var element = <input type="text" value="1" onChange={() => {}} />;
        var markup = ReactDOMServer.renderToString(element);
        var div = document.createElement("div");
        div.innerHTML = markup;
        expect(div.firstChild.getAttribute("value")).toBe("1");
        expect(div.firstChild.getAttribute("defaultValue")).toBe(null);
    });

    it("should render name attribute if it is supplied", () => {
        var container = document.createElement("div");
        var node = ReactDOM.render(<input type="text" name="name" />, container);
        expect(node.name).toBe("name");
        expect(container.firstChild.getAttribute("name")).toBe("name");
    });

    it("should render name attribute if it is supplied for SSR", () => {
        var element = <input type="text" name="name" />;
        var markup = ReactDOMServer.renderToString(element);
        var div = document.createElement("div");
        div.innerHTML = markup;
        expect(div.firstChild.getAttribute("name")).toBe("name");
    });

    it("should not render name attribute if it is not supplied", () => {
        var container = document.createElement("div");
        ReactDOM.render(<input type="text" />, container);
        expect(container.firstChild.getAttribute("name")).toBe(null);
    });

    it("should not render name attribute if it is not supplied for SSR", () => {
        var element = <input type="text" />;
        var markup = ReactDOMServer.renderToString(element);
        var div = document.createElement("div");
        div.innerHTML = markup;
        expect(div.firstChild.getAttribute("name")).toBe(null);
    });

    it('should display "foobar" for `defaultValue` of `objToString`', () => {
        var objToString = {
            toString: function() {
                return "foobar";
            }
        };

        var stub = <input type="text" defaultValue={objToString} />;
        stub = ReactTestUtils.renderIntoDocument(stub);
        var node = ReactDOM.findDOMNode(stub);

        expect(node.value).toBe("foobar");
    });

    it("should display `value` of number 0", () => {
        var stub = <input type="text" value={0} />;
        stub = ReactTestUtils.renderIntoDocument(stub);
        var node = ReactDOM.findDOMNode(stub);

        expect(node.value).toBe("0");
    });

    it("should allow setting `value` to `true`", () => {
        var container = document.createElement("div");
        var stub = <input type="text" value="yolo" onChange={emptyFunction} />;
        var node = ReactDOM.render(stub, container);

        expect(node.value).toBe("yolo");

        stub = ReactDOM.render(<input type="text" value={true} onChange={emptyFunction} />, container);
        expect(node.value).toEqual("true");
    });

    it("should allow setting `value` to `false`", () => {
        var container = document.createElement("div");
        var stub = <input type="text" value="yolo" onChange={emptyFunction} />;
        var node = ReactDOM.render(stub, container);

        expect(node.value).toBe("yolo");

        stub = ReactDOM.render(<input type="text" value={false} onChange={emptyFunction} />, container);
        expect(node.value).toEqual("false");
    });

    it("should allow setting `value` to `objToString`", () => {
        var container = document.createElement("div");
        var stub = <input type="text" value="foo" onChange={emptyFunction} />;
        var node = ReactDOM.render(stub, container);

        expect(node.value).toBe("foo");

        var objToString = {
            toString: function() {
                return "foobar";
            }
        };
        stub = ReactDOM.render(<input type="text" value={objToString} onChange={emptyFunction} />, container);
        expect(node.value).toEqual("foobar");
    });

    it("should not incur unnecessary DOM mutations", () => {
        var container = document.createElement("div");
        ReactDOM.render(<input value="a" onChange={() => {}} />, container);

        var node = container.firstChild;
        var nodeValue = "a";
        var calls = [];
        Object.defineProperty(node, "value", {
            get: function() {
                return nodeValue;
            },
            set: function(newValue) {
                nodeValue = newValue;
                calls.push(newValue);
            }
        });

        ReactDOM.render(<input value="a" onChange={() => {}} />, container);
        expect(calls.length).toBe(0);

        ReactDOM.render(<input value="b" onChange={() => {}} />, container);
        expect(calls.length).toBe(1);
    });

    it("should not incur unnecessary DOM mutations for numeric type conversion", () => {
        var container = document.createElement("div");
        ReactDOM.render(<input value="0" onChange={() => {}} />, container);

        var node = container.firstChild;
        var nodeValue = "0";
        var calls = [];
        Object.defineProperty(node, "value", {
            get: function() {
                return nodeValue;
            },
            set: function(newValue) {
                nodeValue = newValue;
                calls.push(newValue);
            }
        });

        ReactDOM.render(<input value={0} onChange={() => {}} />, container);
        expect(calls.length).toBe(0);
    });

    it("should not incur unnecessary DOM mutations for the boolean type conversion", () => {
        var container = document.createElement("div");
        ReactDOM.render(<input value="true" onChange={() => {}} />, container);

        var node = container.firstChild;
        var nodeValue = "true";
        var calls = [];
        Object.defineProperty(node, "value", {
            get: function() {
                return nodeValue;
            },
            set: function(newValue) {
                calls.push(newValue);
                nodeValue = newValue;
            }
        });

        ReactDOM.render(<input value={true} onChange={() => {}} />, container);
        expect(calls.length).toBe(0);
    });

    it("should properly control a value of number `0`", () => {
        var stub = <input type="text" value={0} onChange={emptyFunction} />;
        stub = ReactTestUtils.renderIntoDocument(stub);
        var node = ReactDOM.findDOMNode(stub);

        node.value = "giraffe";
        ReactTestUtils.Simulate.change(node);
        expect(node.value).toBe("0");
    });

    it("should properly control 0.0 for a text input", () => {
        var stub = <input type="text" value={0} onChange={emptyFunction} />;
        stub = ReactTestUtils.renderIntoDocument(stub);
        var node = ReactDOM.findDOMNode(stub);

        node.value = "0.0";
        ReactTestUtils.Simulate.change(node);
        expect(node.value).toBe("0");
    });

    it("should properly control 0.0 for a number input", () => {
        var container = document.createElement("div");

        document.body.appendChild(container);
        function emptyFunction(){}
        var stub = <input type="number" value={0} onChange={emptyFunction} />;
        stub = ReactDOM.render(stub, container);
        var node = ReactDOM.findDOMNode(stub);

        node.value = "0.0";
        ReactTestUtils.Simulate.change(node);
        expect(node.value).toBe("0.0");
        document.body.removeChild(container);
    });

    it("should properly transition from an empty value to 0", function() {
        var container = document.createElement("div");

        ReactDOM.render(<input type="text" value="" />, container);
        ReactDOM.render(<input type="text" value={0} />, container);

        var node = container.firstChild;

        expect(node.value).toBe("0");
        expect(node.defaultValue).toBe("0");
    });

    it("should properly transition from 0 to an empty value", function() {
        var container = document.createElement("div");

        ReactDOM.render(<input type="text" value={0} />, container);
        ReactDOM.render(<input type="text" value="" />, container);

        var node = container.firstChild;

        expect(node.value).toBe("");
        expect(node.defaultValue).toBe("");
    });

    it("should properly transition a text input from 0 to an empty 0.0", function() {
        var container = document.createElement("div");

        ReactDOM.render(<input type="text" value={0} />, container);
        ReactDOM.render(<input type="text" value="0.0" />, container);

        var node = container.firstChild;

        expect(node.value).toBe("0.0");
        expect(node.defaultValue).toBe("0.0");
    });

    it('should properly transition a number input from "" to 0', function() {
        var container = document.createElement("div");

        ReactDOM.render(<input type="number" value="" />, container);
        ReactDOM.render(<input type="number" value={0} />, container);

        var node = container.firstChild;

        expect(node.value).toBe("0");
        expect(node.defaultValue).toBe("0");
    });

    it('should properly transition a number input from "" to "0"', function() {
        var container = document.createElement("div");

        ReactDOM.render(<input type="number" value="" />, container);
        ReactDOM.render(<input type="number" value="0" />, container);

        var node = container.firstChild;

        expect(node.value).toBe("0");
        expect(node.defaultValue).toBe("0");
    });
    it("should have the correct target value", () => {
        var container = document.createElement("div");
        ReactDOM.render(<input value="0" onChange={() => {}} />, container);

        var handled = false;
        var handler = function(event) {
            expect(event.target.nodeName).toBe("INPUT");
            handled = true;
        };
        var stub = <input type="text" value={0} onChange={handler} />;

        var node = ReactDOM.render(stub, container);

        setUntrackedValue.call(node, "giraffe");

        var fakeNativeEvent = function() {};
        fakeNativeEvent.target = node;
        fakeNativeEvent.path = [node, container];
        ReactTestUtils.Simulate.change(node, fakeNativeEvent);

        expect(handled).toBe(true);
    });

    it("should not set a value for submit buttons unnecessarily", () => {
        var stub = <input type="submit" />;
        stub = ReactTestUtils.renderIntoDocument(stub);
        var node = ReactDOM.findDOMNode(stub);

        // The value shouldn't be '', or else the button will have no text; it
        // should have the default "Submit" or "Submit Query" label. Most browsers
        // report this as not having a `value` attribute at all; IE reports it as
        // the actual label that the user sees.
        expect(!node.hasAttribute("value") || node.getAttribute("value").length > 0).toBe(true);
    });

    it("should control radio buttons", () => {
        class RadioGroup extends React.Component {
            render() {
                return (
                    <div>
                        <input ref="a" type="radio" name="fruit" checked={true} onChange={emptyFunction} />
                        A
                        <input ref="b" type="radio" name="fruit" onChange={emptyFunction} />
                        B
                        <form>
                            <input ref="c" type="radio" name="fruit" defaultChecked={true} onChange={emptyFunction} />
                        </form>
                    </div>
                );
            }
        }

        const stub = ReactTestUtils.renderIntoDocument(<RadioGroup />);
        const aNode = stub.refs.a;
        const bNode = stub.refs.b;
        const cNode = stub.refs.c;

        expect(aNode.checked).toBe(true);
        expect(bNode.checked).toBe(false);
        // c is in a separate form and shouldn't be affected at all here
        expect(cNode.checked).toBe(true);

        bNode.checked = true;
        // This next line isn't necessary in a proper browser environment, but
        // jsdom doesn't uncheck the others in a group (which makes this whole test
        // a little less effective)
        aNode.checked = false;
        expect(cNode.checked).toBe(true);

        // 会同步其他radio
        ReactTestUtils.Simulate.change(bNode);

        // The original state should have been restored
        expect(aNode.checked).toBe(true);
        expect(cNode.checked).toBe(true);
    });

    it("should check the correct radio when the selected name moves", () => {
        class App extends React.Component {
            state = {
                updated: false
            };
            onClick = () => {
                this.setState({ updated: true });
            };
            render() {
                const { updated } = this.state;
                const radioName = updated ? "secondName" : "firstName";
                return (
                    <div>
                        <button type="button" onClick={this.onClick} />
                        <input type="radio" name={radioName} onChange={emptyFunction} checked={updated === true} />
                        <input type="radio" name={radioName} onChange={emptyFunction} checked={updated === false} />
                    </div>
                );
            }
        }

        const stub = ReactTestUtils.renderIntoDocument(<App />);
        const buttonNode = ReactDOM.findDOMNode(stub).childNodes[0];
        const firstRadioNode = ReactDOM.findDOMNode(stub).childNodes[1];
        expect(firstRadioNode.checked).toBe(false);
        ReactTestUtils.Simulate.click(buttonNode);
        expect(firstRadioNode.checked).toBe(true);
    });

    it("should control radio buttons if the tree updates during render", () => {
      
        const sharedParent = document.createElement("div");
        const container1 = document.createElement("div");
        const container2 = document.createElement("div");

        sharedParent.appendChild(container1);

        let aNode;
        let bNode;
        class ComponentA extends React.Component {
            componentDidMount() {
                ReactDOM.render(<ComponentB />, container2);
            }
            render() {
                return (
                    <div>
                        <input ref={n => (aNode = n)} type="radio" name="fruit" checked={true} onChange={emptyFunction} />
                        A
                    </div>
                );
            }
        }

        class ComponentB extends React.Component {
            state = { changed: false };
            handleChange = () => {
                this.setState({
                    changed: true
                });
            };
            componentDidUpdate() {
                //如何让内部事件位于componentDidUpdate后执行呢
                sharedParent.appendChild(container2);
            }
            render() {
                return (
                    <div>
                        <input ref={n => (bNode = n)} type="radio" name="fruit" checked={false} onChange={this.handleChange} />
                        B
                    </div>
                );
            }
        }

        ReactDOM.render(<ComponentA />, container1);

        expect(aNode.checked).toBe(true);
        expect(bNode.checked).toBe(false);

        bNode.checked = true;
        // This next line isn't necessary in a proper browser environment, but
        // jsdom doesn't uncheck the others in a group (which makes this whole test
        // a little less effective)
        aNode.checked = false;

        // 会同步其他radio组件
        ReactTestUtils.Simulate.change(bNode);

        // The original state should have been restored
        expect(aNode.checked).toBe(true);
        expect(bNode.checked).toBe(false);
    });

    it("should warn with value and no onChange handler and readOnly specified", () => {
        spyOnDev(console, "error");
        ReactTestUtils.renderIntoDocument(<input type="text" value="zoink" readOnly={true} />);
        if (__DEV__) {
            expect(console.error.calls.count()).toBe(0);
        }

        ReactTestUtils.renderIntoDocument(<input type="text" value="zoink" readOnly={false} />);
        if (__DEV__) {
            expect(console.error.calls.count()).toBe(1);
            expect(normalizeCodeLocInfo(console.error.calls.argsFor(0)[0])).toBe(
                "Warning: Failed prop type: You provided a `value` prop to a form " +
                    "field without an `onChange` handler. This will render a read-only " +
                    "field. If the field should be mutable use `defaultValue`. " +
                    "Otherwise, set either `onChange` or `readOnly`.\n" +
                    "    in input (at **)"
            );
        }
    });

    it("should have a this value of undefined if bind is not used", () => {
        const unboundInputOnChange = function() {
            //  expect(this).toBe(undefined);
        };

        let instance = <input type="text" onChange={unboundInputOnChange} />;
        instance = ReactTestUtils.renderIntoDocument(instance);

        ReactTestUtils.Simulate.change(instance);
    });

    it("should warn with checked and no onChange handler with readOnly specified", () => {
        spyOnDev(console, "error");
        ReactTestUtils.renderIntoDocument(<input type="checkbox" checked="false" readOnly={true} />);
        if (__DEV__) {
            expect(console.error.calls.count()).toBe(0);
        }

        ReactTestUtils.renderIntoDocument(<input type="checkbox" checked="false" readOnly={false} />);
        if (__DEV__) {
            expect(console.error.calls.count()).toBe(1);
        }
    });

    it("should update defaultValue to empty string", () => {
        const container = document.createElement("div");
        ReactDOM.render(<input type="text" defaultValue={"foo"} />, container);
        ReactDOM.render(<input type="text" defaultValue={""} />, container);
        expect(container.firstChild.defaultValue).toBe("");
    });

    it("should warn if value is null", () => {
        spyOnDev(console, "error");
        ReactTestUtils.renderIntoDocument(<input type="text" value={null} />);
        if (__DEV__) {
            expect(console.error.calls.argsFor(0)[0]).toContain(
                "`value` prop on `input` should not be null. " + "Consider using an empty string to clear the component or `undefined` " + "for uncontrolled components."
            );
        }

        ReactTestUtils.renderIntoDocument(<input type="text" value={null} />);
        if (__DEV__) {
            expect(console.error.calls.count()).toBe(1);
        }
    });

    it("should warn if checked and defaultChecked props are specified", () => {
        spyOnDev(console, "error");
        ReactTestUtils.renderIntoDocument(<input type="radio" checked={true} defaultChecked={true} readOnly={true} />);
        if (__DEV__) {
            expect(console.error.calls.argsFor(0)[0]).toContain(
                "A component contains an input of type radio with both checked and defaultChecked props. " +
                    "Input elements must be either controlled or uncontrolled " +
                    "(specify either the checked prop, or the defaultChecked prop, but not " +
                    "both). Decide between using a controlled or uncontrolled input " +
                    "element and remove one of these props. More info: " +
                    "https://fb.me/react-controlled-components"
            );
        }

        ReactTestUtils.renderIntoDocument(<input type="radio" checked={true} defaultChecked={true} readOnly={true} />);
        if (__DEV__) {
            expect(console.error.calls.count()).toBe(1);
        }
    });

    it("should warn if value and defaultValue props are specified", () => {
        spyOnDev(console, "error");
        ReactTestUtils.renderIntoDocument(<input type="text" value="foo" defaultValue="bar" readOnly={true} />);
        if (__DEV__) {
            expect(console.error.calls.argsFor(0)[0]).toContain(
                "A component contains an input of type text with both value and defaultValue props. " +
                    "Input elements must be either controlled or uncontrolled " +
                    "(specify either the value prop, or the defaultValue prop, but not " +
                    "both). Decide between using a controlled or uncontrolled input " +
                    "element and remove one of these props. More info: " +
                    "https://fb.me/react-controlled-components"
            );
        }

        ReactTestUtils.renderIntoDocument(<input type="text" value="foo" defaultValue="bar" readOnly={true} />);
        if (__DEV__) {
            expect(console.error.calls.count()).toBe(1);
        }
    });

    it("should warn if controlled input switches to uncontrolled (value is undefined)", () => {
        spyOnDev(console, "error");
        const stub = <input type="text" value="controlled" onChange={emptyFunction} />;
        const container = document.createElement("div");
        ReactDOM.render(stub, container);
        ReactDOM.render(<input type="text" />, container);
        if (__DEV__) {
            expect(console.error.calls.count()).toBe(1);
            expect(normalizeCodeLocInfo(console.error.calls.argsFor(0)[0])).toBe(
                "Warning: A component is changing a controlled input of type text to be uncontrolled. " +
                    "Input elements should not switch from controlled to uncontrolled (or vice versa). " +
                    "Decide between using a controlled or uncontrolled input " +
                    "element for the lifetime of the component. More info: https://fb.me/react-controlled-components\n" +
                    "    in input (at **)"
            );
        }
    });

    it("should warn if controlled input switches to uncontrolled (value is null)", () => {
        spyOnDev(console, "error");
        const stub = <input type="text" value="controlled" onChange={emptyFunction} />;
        const container = document.createElement("div");
        ReactDOM.render(stub, container);
        ReactDOM.render(<input type="text" value={null} />, container);
        if (__DEV__) {
            expect(console.error.calls.count()).toBeGreaterThan(0);
            expect(normalizeCodeLocInfo(console.error.calls.argsFor(1)[0])).toBe(
                "Warning: A component is changing a controlled input of type text to be uncontrolled. " +
                    "Input elements should not switch from controlled to uncontrolled (or vice versa). " +
                    "Decide between using a controlled or uncontrolled input " +
                    "element for the lifetime of the component. More info: https://fb.me/react-controlled-components\n" +
                    "    in input (at **)"
            );
        }
    });

    it("should warn if controlled input switches to uncontrolled with defaultValue", () => {
        spyOnDev(console, "error");
        const stub = <input type="text" value="controlled" onChange={emptyFunction} />;
        const container = document.createElement("div");
        ReactDOM.render(stub, container);
        ReactDOM.render(<input type="text" defaultValue="uncontrolled" />, container);
        if (__DEV__) {
            expect(console.error.calls.count()).toBe(1);
            expect(normalizeCodeLocInfo(console.error.calls.argsFor(0)[0])).toBe(
                "Warning: A component is changing a controlled input of type text to be uncontrolled. " +
                    "Input elements should not switch from controlled to uncontrolled (or vice versa). " +
                    "Decide between using a controlled or uncontrolled input " +
                    "element for the lifetime of the component. More info: https://fb.me/react-controlled-components\n" +
                    "    in input (at **)"
            );
        }
    });

    it("should warn if uncontrolled input (value is undefined) switches to controlled", () => {
        spyOnDev(console, "error");
        const stub = <input type="text" />;
        const container = document.createElement("div");
        ReactDOM.render(stub, container);
        ReactDOM.render(<input type="text" value="controlled" />, container);
        if (__DEV__) {
            expect(console.error.calls.count()).toBe(1);
            expect(normalizeCodeLocInfo(console.error.calls.argsFor(0)[0])).toBe(
                "Warning: A component is changing an uncontrolled input of type text to be controlled. " +
                    "Input elements should not switch from uncontrolled to controlled (or vice versa). " +
                    "Decide between using a controlled or uncontrolled input " +
                    "element for the lifetime of the component. More info: https://fb.me/react-controlled-components\n" +
                    "    in input (at **)"
            );
        }
    });

    it("should warn if uncontrolled input (value is null) switches to controlled", () => {
        spyOnDev(console, "error");
        const stub = <input type="text" value={null} />;
        const container = document.createElement("div");
        ReactDOM.render(stub, container);
        ReactDOM.render(<input type="text" value="controlled" />, container);
        if (__DEV__) {
            expect(console.error.calls.count()).toBeGreaterThan(0);
            expect(normalizeCodeLocInfo(console.error.calls.argsFor(1)[0])).toBe(
                "Warning: A component is changing an uncontrolled input of type text to be controlled. " +
                    "Input elements should not switch from uncontrolled to controlled (or vice versa). " +
                    "Decide between using a controlled or uncontrolled input " +
                    "element for the lifetime of the component. More info: https://fb.me/react-controlled-components\n" +
                    "    in input (at **)"
            );
        }
    });

    it("should warn if controlled checkbox switches to uncontrolled (checked is undefined)", () => {
        spyOnDev(console, "error");
        const stub = <input type="checkbox" checked={true} onChange={emptyFunction} />;
        const container = document.createElement("div");
        ReactDOM.render(stub, container);
        ReactDOM.render(<input type="checkbox" />, container);
        if (__DEV__) {
            expect(console.error.calls.count()).toBe(1);
            expect(normalizeCodeLocInfo(console.error.calls.argsFor(0)[0])).toBe(
                "Warning: A component is changing a controlled input of type checkbox to be uncontrolled. " +
                    "Input elements should not switch from controlled to uncontrolled (or vice versa). " +
                    "Decide between using a controlled or uncontrolled input " +
                    "element for the lifetime of the component. More info: https://fb.me/react-controlled-components\n" +
                    "    in input (at **)"
            );
        }
    });

    it("should warn if controlled checkbox switches to uncontrolled (checked is null)", () => {
        spyOnDev(console, "error");
        const stub = <input type="checkbox" checked={true} onChange={emptyFunction} />;
        const container = document.createElement("div");
        ReactDOM.render(stub, container);
        ReactDOM.render(<input type="checkbox" checked={null} />, container);
        if (__DEV__) {
            expect(console.error.calls.count()).toBe(1);
            expect(normalizeCodeLocInfo(console.error.calls.argsFor(0)[0])).toBe(
                "Warning: A component is changing a controlled input of type checkbox to be uncontrolled. " +
                    "Input elements should not switch from controlled to uncontrolled (or vice versa). " +
                    "Decide between using a controlled or uncontrolled input " +
                    "element for the lifetime of the component. More info: https://fb.me/react-controlled-components\n" +
                    "    in input (at **)"
            );
        }
    });

    it("should warn if controlled checkbox switches to uncontrolled with defaultChecked", () => {
        spyOnDev(console, "error");
        const stub = <input type="checkbox" checked={true} onChange={emptyFunction} />;
        const container = document.createElement("div");
        ReactDOM.render(stub, container);
        ReactDOM.render(<input type="checkbox" defaultChecked={true} />, container);
        if (__DEV__) {
            expect(console.error.calls.count()).toBe(1);
            expect(normalizeCodeLocInfo(console.error.calls.argsFor(0)[0])).toBe(
                "Warning: A component is changing a controlled input of type checkbox to be uncontrolled. " +
                    "Input elements should not switch from controlled to uncontrolled (or vice versa). " +
                    "Decide between using a controlled or uncontrolled input " +
                    "element for the lifetime of the component. More info: https://fb.me/react-controlled-components\n" +
                    "    in input (at **)"
            );
        }
    });

    it("should warn if uncontrolled checkbox (checked is undefined) switches to controlled", () => {
        spyOnDev(console, "error");
        const stub = <input type="checkbox" />;
        const container = document.createElement("div");
        ReactDOM.render(stub, container);
        ReactDOM.render(<input type="checkbox" checked={true} />, container);
        if (__DEV__) {
            expect(console.error.calls.count()).toBe(1);
            expect(normalizeCodeLocInfo(console.error.calls.argsFor(0)[0])).toBe(
                "Warning: A component is changing an uncontrolled input of type checkbox to be controlled. " +
                    "Input elements should not switch from uncontrolled to controlled (or vice versa). " +
                    "Decide between using a controlled or uncontrolled input " +
                    "element for the lifetime of the component. More info: https://fb.me/react-controlled-components\n" +
                    "    in input (at **)"
            );
        }
    });

    it("should warn if uncontrolled checkbox (checked is null) switches to controlled", () => {
        spyOnDev(console, "error");
        const stub = <input type="checkbox" checked={null} />;
        const container = document.createElement("div");
        ReactDOM.render(stub, container);
        ReactDOM.render(<input type="checkbox" checked={true} />, container);
        if (__DEV__) {
            expect(console.error.calls.count()).toBe(1);
            expect(normalizeCodeLocInfo(console.error.calls.argsFor(0)[0])).toBe(
                "Warning: A component is changing an uncontrolled input of type checkbox to be controlled. " +
                    "Input elements should not switch from uncontrolled to controlled (or vice versa). " +
                    "Decide between using a controlled or uncontrolled input " +
                    "element for the lifetime of the component. More info: https://fb.me/react-controlled-components\n" +
                    "    in input (at **)"
            );
        }
    });

    it("should warn if controlled radio switches to uncontrolled (checked is undefined)", () => {
        spyOnDev(console, "error");
        const stub = <input type="radio" checked={true} onChange={emptyFunction} />;
        const container = document.createElement("div");
        ReactDOM.render(stub, container);
        ReactDOM.render(<input type="radio" />, container);
        if (__DEV__) {
            expect(console.error.calls.count()).toBe(1);
            expect(normalizeCodeLocInfo(console.error.calls.argsFor(0)[0])).toBe(
                "Warning: A component is changing a controlled input of type radio to be uncontrolled. " +
                    "Input elements should not switch from controlled to uncontrolled (or vice versa). " +
                    "Decide between using a controlled or uncontrolled input " +
                    "element for the lifetime of the component. More info: https://fb.me/react-controlled-components\n" +
                    "    in input (at **)"
            );
        }
    });

    it("should warn if controlled radio switches to uncontrolled (checked is null)", () => {
        spyOnDev(console, "error");
        const stub = <input type="radio" checked={true} onChange={emptyFunction} />;
        const container = document.createElement("div");
        ReactDOM.render(stub, container);
        ReactDOM.render(<input type="radio" checked={null} />, container);
        if (__DEV__) {
            expect(console.error.calls.count()).toBe(1);
            expect(normalizeCodeLocInfo(console.error.calls.argsFor(0)[0])).toBe(
                "Warning: A component is changing a controlled input of type radio to be uncontrolled. " +
                    "Input elements should not switch from controlled to uncontrolled (or vice versa). " +
                    "Decide between using a controlled or uncontrolled input " +
                    "element for the lifetime of the component. More info: https://fb.me/react-controlled-components\n" +
                    "    in input (at **)"
            );
        }
    });

    it("should warn if controlled radio switches to uncontrolled with defaultChecked", () => {
        spyOnDev(console, "error");
        const stub = <input type="radio" checked={true} onChange={emptyFunction} />;
        const container = document.createElement("div");
        ReactDOM.render(stub, container);
        ReactDOM.render(<input type="radio" defaultChecked={true} />, container);
        if (__DEV__) {
            expect(console.error.calls.count()).toBe(1);
            expect(normalizeCodeLocInfo(console.error.calls.argsFor(0)[0])).toBe(
                "Warning: A component is changing a controlled input of type radio to be uncontrolled. " +
                    "Input elements should not switch from controlled to uncontrolled (or vice versa). " +
                    "Decide between using a controlled or uncontrolled input " +
                    "element for the lifetime of the component. More info: https://fb.me/react-controlled-components\n" +
                    "    in input (at **)"
            );
        }
    });

    it("should warn if uncontrolled radio (checked is undefined) switches to controlled", () => {
        spyOnDev(console, "error");
        const stub = <input type="radio" />;
        const container = document.createElement("div");
        ReactDOM.render(stub, container);
        ReactDOM.render(<input type="radio" checked={true} />, container);
        if (__DEV__) {
            expect(console.error.calls.count()).toBe(1);
            expect(normalizeCodeLocInfo(console.error.calls.argsFor(0)[0])).toBe(
                "Warning: A component is changing an uncontrolled input of type radio to be controlled. " +
                    "Input elements should not switch from uncontrolled to controlled (or vice versa). " +
                    "Decide between using a controlled or uncontrolled input " +
                    "element for the lifetime of the component. More info: https://fb.me/react-controlled-components\n" +
                    "    in input (at **)"
            );
        }
    });

    it("should warn if uncontrolled radio (checked is null) switches to controlled", () => {
        spyOnDev(console, "error");
        const stub = <input type="radio" checked={null} />;
        const container = document.createElement("div");
        ReactDOM.render(stub, container);
        ReactDOM.render(<input type="radio" checked={true} />, container);
        if (__DEV__) {
            expect(console.error.calls.count()).toBe(1);
            expect(normalizeCodeLocInfo(console.error.calls.argsFor(0)[0])).toBe(
                "Warning: A component is changing an uncontrolled input of type radio to be controlled. " +
                    "Input elements should not switch from uncontrolled to controlled (or vice versa). " +
                    "Decide between using a controlled or uncontrolled input " +
                    "element for the lifetime of the component. More info: https://fb.me/react-controlled-components\n" +
                    "    in input (at **)"
            );
        }
    });

    it("should not warn if radio value changes but never becomes controlled", () => {
        const container = document.createElement("div");
        ReactDOM.render(<input type="radio" value="value" />, container);
        ReactDOM.render(<input type="radio" />, container);
        ReactDOM.render(<input type="radio" value="value" defaultChecked={true} />, container);
        ReactDOM.render(<input type="radio" value="value" onChange={() => null} />, container);
        ReactDOM.render(<input type="radio" />, container);
    });

    it("should not warn if radio value changes but never becomes uncontrolled", () => {
        const container = document.createElement("div");
        ReactDOM.render(<input type="radio" checked={false} onChange={() => null} />, container);
        ReactDOM.render(<input type="radio" value="value" defaultChecked={true} checked={false} onChange={() => null} />, container);
    });

    it("should warn if radio checked false changes to become uncontrolled", () => {
        spyOnDev(console, "error");
        const container = document.createElement("div");
        ReactDOM.render(<input type="radio" value="value" checked={false} onChange={() => null} />, container);
        ReactDOM.render(<input type="radio" value="value" />, container);
        if (__DEV__) {
            expect(normalizeCodeLocInfo(console.error.calls.argsFor(0)[0])).toBe(
                "Warning: A component is changing a controlled input of type radio to be uncontrolled. " +
                    "Input elements should not switch from controlled to uncontrolled (or vice versa). " +
                    "Decide between using a controlled or uncontrolled input " +
                    "element for the lifetime of the component. More info: https://fb.me/react-controlled-components\n" +
                    "    in input (at **)"
            );
        }
    });

    it("sets value properly with type coming later in props", () => {
        const input = ReactTestUtils.renderIntoDocument(<input value="hi" type="radio" />);
        expect(input.value).toBe("hi");
    });

    it("does not raise a validation warning when it switches types", () => {
        class Input extends React.Component {
            state = { type: "number", value: 1000 };

            render() {
                const { value, type } = this.state;
                return <input onChange={() => {}} type={type} value={value} />;
            }
        }

        const input = ReactTestUtils.renderIntoDocument(<Input />);
        const node = ReactDOM.findDOMNode(input);

        // If the value is set before the type, a validation warning will raise and
        // the value will not be assigned.
        input.setState({ type: "text", value: "Test" });
        expect(node.value).toEqual("Test");
    });

    it("always sets the attribute when values change on text inputs", function() {
        const Input = getTestInput();
        const stub = ReactTestUtils.renderIntoDocument(<Input type="text" />);
        const node = ReactDOM.findDOMNode(stub);
        node.value = "2"
        ReactTestUtils.Simulate.change(node, {target: {value: '2'}});

        expect(node.getAttribute("value")).toBe("2");
    });

    it("does not set the value attribute on number inputs if focused", () => {
        //无法模拟浏览器行为
        return 
        const Input = getTestInput();
        const stub = ReactTestUtils.renderIntoDocument(<Input type="number" value="1" />);
        const node = ReactDOM.findDOMNode(stub);

        node.focus();
        ReactTestUtils.Simulate.change(node, {target: {value: '2'}});

        expect(node.getAttribute("value")).toBe("1");
    });

    it("sets the value attribute on number inputs on blur", () => {
        const Input = getTestInput();
        //受控组件
        const stub = ReactTestUtils.renderIntoDocument(<Input type="number" value="1" />);
        const node = ReactDOM.findDOMNode(stub);
        node.value = "2"
        ReactTestUtils.Simulate.change(node);
        
        node.blur();

        expect(node.getAttribute("value")).toBe("2");
    });

    it("an uncontrolled number input will not update the value attribute on blur", () => {
        const stub = ReactTestUtils.renderIntoDocument(<input type="number" defaultValue="1" />);
        const node = ReactDOM.findDOMNode(stub);

        node.value = 4;

        node.blur();

        expect(node.getAttribute("value")).toBe("1");
    });

    it("an uncontrolled text input will not update the value attribute on blur", () => {
        const stub = ReactTestUtils.renderIntoDocument(<input type="text" defaultValue="1" />);
        const node = ReactDOM.findDOMNode(stub);

        node.value = 4;

        node.blur();

        expect(node.getAttribute("value")).toBe("1");
    });
});