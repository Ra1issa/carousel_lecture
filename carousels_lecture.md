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
    3. Traversing the AST and constructing our metric accordingly. We do so by exposing Babel's visitor patterns and cumulitavely building the metric.
    4. Plotting our findings for visiualizing and interpreting the results.


## Quick word on Babel



In the file `client.js`, we start by connecting to the server. First, we define the `hostname` that the server above is
running on. Second, since this is a multi-party computation, we need to tell the server how many parties there are
(`party_count`), and the name of our computation(`computation_id`).

The `make_jiff` function uses this information to set up a new JIFF object.
We save the fully configured `jiff_instance` in a global variable, so we can use it when we compute our function.

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

## Computing the standard deviation

Say there are *n* parties in your computation, each with input *x_i*. Let *m* be the mean of the inputs *x_i*. Recall
that the (population) variance of a series of values is defined to be the sum between *i=1* and *n* of
*(1/n)(x_i - m)^2*. The standard deviation is then the square root of the variance.

We could choose to compute this expression directly under MPC by secret-sharing the *x_i* values, subtracting the mean
from them, and squaring this and then summing, normalizing by *n*, and taking the square root, all under MPC. However,
this will be both messy to write and inefficient: any multiplication done under MPC is time-intensive, and here there
are many.

There are a few things we can do to cut down on the computational overhead. First, note that the variance is really what
needs to be computed under MPC: the value of *n* is public so we can derive the standard deviation from the variance
publicly without incurring any additional privacy loss.

Secondly, one can recall that there is an alternate formulation of the variance, which is

*E[X]^2 - E[X^2],*

where *E* denotes the expected value, i.e. variance is equal to the difference between the square of the
mean of the input values and the mean of the input values squared.

We can make this slightly faster by moving some of the normalization to post-processing, i.e. writing variance as

*(1/n)[(sum over X)^2/n - (sum over X^2)].*

Thus, variance can be calculated by each user
locally computing the square of their value, then secret sharing both their value and their value squared to compute the
means of both. Since *n* is a constant, the multiplication by *1/n* to compute the means is computationally inexpensive,
there is only one single secure multiplication that must take place, when *E[X]* is squared.

In code, here is an outline of what we will do given each party's arbitrary input value *x_i* and number of parties *n*.

```javascript
function compute() {
  var x_i; //input: will be passed into computation in final version
  var n;   //number of parties: will be passed into computation in final version

  // calculate x_i^2
  ...
  // share x_i and x_i^2
  ...
  // secretly compute sum of x_i's
  ...
  // secretly compute sum of x_i^2's
  ...
  // square the sum of x^i's
  ...
  // normalize the square of the sum of x_i's
  ...
  // subtract the sum of x_i^2's from this
  ...
  // open the results
  ...
  // normalize the result
  ...
  // Take the square root of this
  ...
  // print this final result
  ...
}
```

The first step is to share our input and our input squared with the rest of the parties. We use our saved and configured
 `jiff_instance` to do so. This operation is asynchronous: it requires communicating with every party to secret share
 the data. It returns a promise.

The sharing function is passed the input. In this case, all party inputs are length one, and they're all providing the
same type of input. These items are customizable, but in this case the basic implementation is sufficient.

```javascript
 var shares = jiff_instance.share(input);
 var in_squared = jiff_instance.share(input**2);
```

However, since the input squared might have more decimal points than the original input and we are restricted to some
fixed number of decimal points depending on our settings, the `in_squared` variable first needs to have input**2
truncated to that number of decimal points. Say we want to truncate to 2 decimal points. Then,

```javascript
var in_squared_fixed = Number.parseFloat((Math.pow(input, 2)).toFixed(2)); //convert input^2 to fixed point number
var in_squared = jiff_instance.share(in_squared_fixed);
```

Once everyone's input is shared, we'll compute their sums. The promises that `shares` and `in_squared` return are
objects containing the shares from every party in an object. They have the form
```
{1 : [<party 1's array>], 2 : [<party 2's array>], n: [<party n's array>]}
```

To sum the secret-shares, we use the secret addition function, `sadd`
```javascript
var in_sum = shares[1];
var in_squared_sum = in_squared[1];

for (var i = 2; i <= jiff_instance.party_count; i++) {    // sum all inputs and sum all inputs squared
      in_sum = in_sum.sadd(shares[i]);
      in_squared_sum = in_squared_sum.sadd(in_squared[i]);
    }
```
Next, we need to normalize the sum of the inputs. Since *1/n* may as a floating point number have more values after the
decimal than our settings can handle, we first truncate this to a fixed amount and then do a secret multiplication by this.

```javascript
 var one_over_n = Number.parseFloat((1/jiff_instance.party_count).toFixed(2)); // convert 1/n to fixed point number
 var in_sum_squared = in_sum.smult(in_sum);
 var intermediary = in_sum_squared.cmult(one_over_n);
```

We can then compute the difference between this and the sum of inputs squared.

```javascript
var out = in_squared_sum.ssub(intermediary);
```

Finally, we need to reveal the results to each party. We use a promise to resolve the results
from all parties, then do the final post-processing on this reveal.

```javascript
//Create a promise of output
var promise = jiff_instance.open(out);

var promise2 = promise.then(function (v) {
  var variance = v/(jiff_instance.party_count - 1);
  return Math.sqrt(variance);       // Return standard deviation.
});
```

The `compute` function looks like this:

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
