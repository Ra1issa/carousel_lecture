```neptune[inject=true,language=CSS]
body{
  padding-right: 20%;
  padding-left: 20%;
  line-height: 1.6;
  font-family: Verdana,Arial,Sans-serif;
  color:#173834;
}
h1{
  color:#C48C17;
  font-weight: light;
  padding-bottom: 3%;
}
h2{
  padding-top: 2%;
  padding-bottom: 1%;
  color:#C48C17;
  font-weight: light;  
}

textarea{
  width:100%;
  height: 20%;
  box-sizing: border-box;         /* For IE and modern versions of Chrome */
  -moz-box-sizing: border-box;    /* For Firefox                          */
  -webkit-box-sizing: border-box; /* For Safari        
}
```
```neptune[inject=true,language=HTML]
<script src="/lib/lodash.core.min.js"></script>
<script src="/lib/jquery-2.1.1.js"></script>
<script src="/lib/babel.min.js"></script>
<script src="/lib/randomColor.min.js"></script>
<script src="/lib/plotly-latest.min.js"></script>
<script src="/lib/polynomium.js"></script>
<script src="/carousels/lib/imparse.js"></script>
<script src="/carousels/lib/carousels.js"></script>
<script src="/carousels/lib/costs.js"></script>
<script src="/carousels/lib/metric.js"></script>
<script src="/carousels/lib/plot.js"></script>
<script src="/carousels/lib/setup.js"></script>
```

# Example of Static Cost Analysis: Carousels


  These notes cover an example of defining and analyzing abstract metrics over [jiff](https://multiparty.org/jiff/docs/jsdoc/), a generic Javascript framework for MultiParty Computation (MPC).

*Relevant libraries: [jiff](https://multiparty.org/jiff/docs/jsdoc/), [Babel](https://babeljs.io/), [polynomium](https://github.com/lapets/polynomium/), [imparse](https://github.com/lapets/imparse), [plotly](https://plot.ly/javascript/)*

*You can also find the full working version of carousels [here](https://multiparty.org/carousels/) and the [source code here](https://github.com/multiparty/carousels)*.

## Motivation

  It is often critical in practice to automatically give upper bounds and estimates on resource usage of programs before reaching production. Several such scenarios include:

  * Safety critical applications where we may need to catch vulnerabilities and side channels before deployment.
  * Time critical applications where we need to finish tasks in a hard deadline.
  * Memory critical applications where we may be limited by the total amount of memory our program can use.
  * Cost critical applications where there may be a $ cost per resource usage.
  * etc.

This problem is somewhat juxtaposed to the problem of giving asymptotic bounds of *whatever metric you pick* for algorithms because of the importance of giving representative constants:
  While in an algorithms course you may be told that binary search  takes in the worst case O(1) space complexity, we will actually care about the hidden constant that is slipped under the Big Oh notation. That will sometimes make the difference between saying that our program will use 10 GB or 10 MB in memory.

While it may generally be undecidable to perform resource estimates of generic programs, we may restrict our focus on subsets of languages for which the problem becomes solvable. Fortunately, these restrictions do not completely deter our programs expressiveness and may still form meaningful estimates for codes that programmers typically develop.

## Problem Definition

  In our specific example, we will be looking at the problem of estimating relevant metrics for MPC *(a subfield of cryptography that deals with distributive protocols for computing functions over secret data among multiple parties)*: The numbers of rounds of communication an MPC protocol takes.

  We need to do so by never actually running the program but rather statically analyzing it. In order to do so, we will be:

  1. Specifying the costs of MPC primitives written in jiff. These costs may later be updated depending on the
  environment in which we run our protocol *(browser, hardware, etc.)* .
  2. Parsing the code we would like to analyze according to Javascripts grammar and transforming it into an AST.
  Thankfully for us, Babel will take care of tokenizing and annotating different sections of the code and will produce the necessary AST for us.
  3. Traversing the AST and deriving our metric. We do so by exposing Babel's visitor patterns and cumulatively constructing the metric accordingly.
  4. Plotting our findings for visualization and interpretation of results.


## Quick word on Babel

Babel is a Javascript compiler that is used to convert new JS syntax and features (e.g. ES6+) into backward compatible JS supported by older environments. *In practice, you may often use JS features that will not be supported by your clients browsers (e.g. Internet Explorer) and would need such a tool.* Babel's compilation process happens in 3 steps:

 1. Generate an AST by parsing the JS code
 2. Transform the AST in order to transpile the code into older versions of JS
 3. Generate the resulting code from the transformed AST


You can test it out and play around with a dummy example over [here](https://babeljs.io/repl/#?babili=false&browsers=&build=&builtIns=false&spec=false&loose=false&code_lz=NoRgNABATJDMC6A6AtgQwA4ApMDsCUEAvAHwQ4QDUEIeAUEA&debug=false&forceAllTransforms=false&shippedProposals=false&circleciRepo=&evaluate=false&fileSize=false&timeTravel=false&sourceType=module&lineWrap=true&presets=es2015%2Creact%2Cstage-2&prettier=false&targets=&version=7.6.0&externalPlugins=).

We will specifically be using Babel's plugins. These plugins are executed in the 2nd compilation step and allow for custom or predefined transformations of the AST. Without any plugins, Babel will not modify the AST. We will register a "metric" plugin that will inject a "metric" parameter in each node of the AST, then define how to construct this metric in the visitor patterns.




## A Simple version of Carousels

Code to Analyze:
```neptune[title=Code,inject=true,language=HTML]
<textarea id="code" width="100%">
function bubblesort(x){
  var arr = [1,2,3,4];

  var arr_bool = arr.map((curr,i) => arr[i].lt(arr[i+1]));
  arr = arr.map((curr,i) => arr_bool[i].if_else(arr_bool[i-1].if_else(arr[i],arr[i-1]), arr[i+1]));

  return arr;
}
</textarea>
```

Cost specification of Online Rounds:
```neptune[inject=true,language=HTML]
<textarea id="spec_cost">
</textarea>
```

```neptune[title=Cost_Analysis,language=javascript]

var spec = costs["onlineRounds"];
var spec_cost = {};
var input = document.getElementById("code").value;
document.getElementById("spec_cost").innerHTML = JSON.stringify(costs["onlineRounds"], null,'\t');


// Turn each of the cost specification into polynomials that can be manipulated

for (var op in spec){
  spec_cost[op] = carousels.parsePoly(spec[op]);
}

// Register the 'metric' plugin and specificy the method which construct the
// metric (i.e. "createMetric").

Babel.registerPlugin('metric', createMetric(spec_cost));

// Apply the metric on the input code's AST
var bbl = Babel.transform(input, {plugins: ['metric']});

// Retrieve the result of the transformation
var bbl_result = bbl.ast.program.results;

document.getElementById("out").innerHTML = JSON.stringify(bbl_result, {maxLength:120}).trim();

// The output of Babel returns a string. We use the polynomium library to turn
// this string into an actual polynomial.

var pol = carousels.parsePoly(bbl_result["bubblesort"]);
console.log(pol);

// Compute the polynomial over actual inputs (compute_values invoke polynomium's
// method for evaluating polynomials on inputs)

var results = compute_values([pol], 1);

// Plot the results
plot2d("onlineRounds", "bubblesort", results);

```
Result of Analysis:
```neptune[inject=true,language=HTML]
<textarea id="out">
</textarea>
```
Plot:
```neptune[inject=true,language=HTML]
<div id="myPlot"></div>
```


## Looking at the Visitor Patterns

Code to Analyze:
```neptune[inject=true,language=HTML]
<textarea id="code2" width="100%">
function addition(){
  var x = 1;
  var y = 2;

  return x+y;
}
</textarea>
```
What does a node in Babel's AST look like ?
```neptune[inject=true,language=HTML]
<textarea id="node" width="100%">
</textarea>
```

What does the transformed Babel AST look like ?
```neptune[inject=true,language=HTML]
<textarea id="ast" width="100%">
</textarea>
```

```neptune[title=Visitor_Patterns,language=javascript]
var createMetric2 = function(spec) {

  var dict = {}; // acts as a stack
  dict["arrays"] = [];

  return function () {
    var zero = polynomium.c(0).toObject(), //create constant polynomium = 0
        one = polynomium.c(1).toObject(), //create constant polynomium = 1
        plus = function (sum, node) { return polynomium.add(sum, node.metric).toObject(); },
        dot = function (mult, node) { return polynomium.mul(mult, node.metric).toObject(); }
        ;

    return carousels.babelVisitorDefaults({
      visitor: {
        Program: {
          "exit": function (p) {

            var results = {}, metric = {};
            for (var i = 0; i < p.node.body.length; i++) {
              metric[p.node.body[i].id.name] = p.node.body[i].metric;
              results[p.node.body[i].id.name] = polynomium.toString(p.node.body[i].metric);
            }
            p.node.metric = metric;
            p.node.results = results;
            document.getElementById("ast").value = JSON.stringify(p.node, null,'\t');
          }
        },
        FunctionDeclaration: {
          "exit": function (p) {
            p.node.metric = p.node.body.metric;
            dict[p.node.id.name] = p.node;
          }
        },
        BlockStatement: {
          "exit": function (p) {
            p.node.metric = p.node.body.reduce(plus, zero);
          }
        },
        Identifier: {
          "exit": function (p) {
            p.node.metric = zero;
          }
        },
        VariableDeclaration: {
          "exit": function (p) {
            p.node.metric = p.node.declarations.reduce(plus, zero);
          }
        },
        VariableDeclarator: {
          "exit": function (p) {
            p.node.metric = p.node.init.metric;
          }
        },
        ReturnStatement: {
          "exit": function (p) {
            p.node.metric = p.node.argument.metric;
          }
        },
        BinaryExpression: {
          "exit": function (p) {
            var start = p.node.loc.start, op = p.node.operator;
            if (op in spec) {
              p.node.metric = [p.node.left, p.node.right].reduce(plus, spec[op]);
            } else {
              throw Error("Node type BinaryExpression with operator " + op +
                          " is not handled at line " + start.line + ", column " + start.column + ".");
            }
            document.getElementById("node").value = JSON.stringify(p.node, null,'\t');
          }
        },
        NumericLiteral: {
          "exit": function (p) {
            p.node.metric = zero;
          }
        }
      }
    });
  };
}
var spec = costs["onlineRounds"];
var spec_cost = {};
var input = document.getElementById("code2").value;
document.getElementById("spec_cost").innerHTML = JSON.stringify(costs["onlineRounds"], null,'\t');
for (var op in spec){spec_cost[op] = carousels.parsePoly(spec[op]);}
Babel.registerPlugin('metric', createMetric2(spec_cost));
var bbl = Babel.transform(input, {plugins: ['metric']});
var bbl_result = bbl.ast.program.results;
document.getElementById("out").innerHTML = JSON.stringify(bbl_result, {maxLength:120}).trim();
var pol = carousels.parsePoly(bbl_result["addition"]);
var results = compute_values([pol], 1);

```


## Future Work

We are working on extending Carousels to other languages, etc.

## Contact

If you have any questions feel free to ask me on Piazza or email me at ra1issa@bu.edu
