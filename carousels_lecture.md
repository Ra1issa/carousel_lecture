# Carousels as an example of Static Cost Analysis

  These notes cover an example of defining and analyzing abstract metrics over [jiff](https://multiparty.org/jiff/docs/jsdoc/), a generic Javascript framework for MultiParty Computation (MPC).

*Relevant libraries: [jiff](https://multiparty.org/jiff/docs/jsdoc/), [Babel](https://babeljs.io/), [polynomium](https://github.com/lapets/polynomium/), [imparse](https://github.com/lapets/imparse), [plotly](https://plot.ly/javascript/)*

# Motivation

  It is often critical in practice to automatically give upper bounds and estimates on resource usage of programs before reaching production in their lifeline.
Several such scenarios include:
    * Safety critical applications where we may need to catch vulnerabilities and side channels before deployment.
    * Time critical applications where we need to finish tasks in a hard deadline.
    * Memory critical applications where we may be limited by the total amount of memory our program can use.
    * Cost critical applications where there may be a $ cost per resource usage.
    * etc.

  This problem is somewhat juxtaposed to the problem of giving asymptotic bounds of *whatever metric you pick* of algorithms because of the essentialness of giving representative constants:
    While in an algorithms course you may be told that binary search in the worst case takes O(1) space complexity, we will actually care about the hidden constant that is slipped in the Big Oh notation. That will make the difference between saying that our program will use 10 GB or 10 MB in memory.

  While it may generally be undecidable to perform resource estimates of generic programs, we may restrict our focus on subsets of languages for which the problem becomes solvable. Fortunately, these restrictions do not completely deter our programs expressiveness and may still form meaningful estimates for codes that programmers typically develop.

# Problem Definition

  In our specific example, we will be looking at the problem of estimating relevant metrics for MPC *(a subfield of cryptography that deals with distributive protocols for computing functions over secret data among multiple parties)*:

    * The numbers of rounds of communication an MPC protocol takes
    * The number of total messages sent between parties

  We need to do so by never actually running the program but rather statically analyzing it. In order to do so, we will be:

    1. First defining a formal cost semantics for MPC primitives written in jiff. These costs may later be updated depending on the enviornement in which we run our protocol *(browser, hardware, etc.)* .
    2. Parsing the code we would like to analyze according to Javascripts grammar and transforming it into an AST (abstract syntax tree). Thankfully for us, Babel will take care of tokenizing and anotating different sections of the code and will produce the necessary AST for us.
    3. Traversing the AST and deriving our metric. We do so by exposing Babel's visitor patterns and cumulitavely constructing the metric accordingly.
    4. Plotting our findings for visiualizing and interpreting the results.


## Quick word on Babel

Babel is a Javascript compiler that is used to convert new JS syntax and features (e.g. ES6+) into backward compatible JS supported by older enviornements. *In practice, you may often use javascript features that will not be supported by your clients browsers (e.g. Internet Explorer) and would need such a tool.* Babel's compilation process happens in 3 steps:

 1. Generate an AST by parsing the JS code
 2. Transform the AST in order to transpile the code into older versions of JS
 3. Generate the resulting code from the transformed AST

You can test it out and play around with a dummy example over [here](https://babeljs.io/repl/#?babili=false&browsers=&build=&builtIns=false&spec=false&loose=false&code_lz=NoRgNABATJDMC6A6AtgQwA4ApMDsCUEAvAHwQ4QDUEIeAUEA&debug=false&forceAllTransforms=false&shippedProposals=false&circleciRepo=&evaluate=false&fileSize=false&timeTravel=false&sourceType=module&lineWrap=true&presets=es2015%2Creact%2Cstage-2&prettier=false&targets=&version=7.6.0&externalPlugins=).

We will specifically be using Babel's plugins. These plugins are executed in the 2nd compilation step and allow for custom or predefined transformations of the AST. Without any plugins, Babel will not modify the AST. We will register a "metric" plugin that will inject a "metric" parameter in each node of the AST, then define how to construct this metric in the visitor patterns.




## Defining Cost Semantics for Carousels

```neptune[title=Party&nbsp1]
var jiff_instance;

function connect() {

  var hostname = "http://localhost:8080";

  var computation_id = 'stand_dev';
  var options = {party_count: 3};

  // TODO: is this necessary if we're using npm?
  if (node) {
    jiff = require('../../lib/jiff-client');
    $ = require('jquery-deferred');
  }

  jiff_instance = jiff.make_jiff(hostname, computation_id, options);
}
```

```javascript
function compute() {
    var shares = jiff_instance.share(input);
    var in_sum = shares[1];
    var in_squared_fixed = Number.parseFloat((Math.pow(input, 2)).toFixed(2)); //convert input^2 to fixed point number
    var in_squared = jiff_instance.share(in_squared_fixed);
    var in_squared_sum = in_squared[1];

    for (var i = 2; i <= jiff_instance.party_count; i++) {    // sum all inputs and sum all inputs squared
      in_sum = in_sum.sadd(shares[i]);
      in_squared_sum = in_squared_sum.sadd(in_squared[i]);
    }

    var one_over_n = Number.parseFloat((1/jiff_instance.party_count).toFixed(2)); // convert 1/n to fixed point number
    var in_sum_squared = in_sum.smult(in_sum);
    var intermediary = in_sum_squared.cmult(one_over_n);
    var out = in_squared_sum.ssub(intermediary);


    //Create a promise of output
    var promise = jiff_instance.open(out);

    var promise2 = promise.then(function (v) {
      var variance = v/(jiff_instance.party_count - 1);
      return Math.sqrt(variance);       // Return standard deviation.
    });

    return promise2;

}
```


# Complete Files

For complete files and running instructions, navigate to /demos/standard-deviation.
