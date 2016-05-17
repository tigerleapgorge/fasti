// Force directed Abstract Syntax Tree Interpreter Copyright Charles Li

(function () {
    "use strict";
    var canvas = document.getElementById("myCanvas");
    var ctx = canvas.getContext("2d");
/*******                Data                     ******/
    var sourceCode = "( + 3 5 )";
    var tokenArray = [];
    var ast = [];

/*******                Vector                      ******/
    function Vector(x, y) {
        if ( !(this instanceof Vector) ) { // dont need new
           var new_vec = new Vector(x, y);
           return new_vec;
        }
        this.x = x || 0;
        this.y = y || 0;
    };

	Vector.prototype.add = function(vecArg) {
        return new Vector(this.x + vecArg.x, this.y + vecArg.y);
	};

    var deltaRightVector = new Vector(50,0);
    var deltaDownVector = new Vector(0,50);

/*******                Graphics                      ******/
    function drawText(myStr, posVector){
        ctx.font = "25px Arial";
        ctx.fillStyle = "#0095DD";
        ctx.fillText(myStr, posVector.x-10, posVector.y+7);
    }

    function drawAll(){ // draw loop
        ctx.clearRect(0, 0, canvas.width, canvas.height); // clear screen
        drawText(sourceCode, Vector(20,20) ); // TODO: change hard coded
        drawText(tokenArray, Vector(20,50) ); // TODO: change hard coded
        drawText(ast, Vector(20,80) );

		requestAnimationFrame(drawAll); // loop
    }
    
    var categorize = function(curToken){
        if ( !isNaN(curToken) ) {
            return { type : "number" , value : parseFloat(curToken) };
        } else {
            return { type : "identifier", value : curToken };
        }
    }
    
    var parenthesize = function(tokenList) {
        var retArray = [];
        while( tokenList.length ) {
            var curToken = tokenList.shift();
            if(curToken === "("){ 
                retArray.push( parenthesize(tokenList) ); // recursive
            } else if(curToken === ")") {
                return retArray;
            } else {
                retArray.push( categorize(curToken) );
            }
        }
        return retArray;
    }
    
    var library = {
        "+" : function(x, y) {
                console.log("plus", x, y, x[0], x[1]);
                return x[0] + x[1];
              }
        
    }
    
    var Context = function(scope, parent) {
        this.scope = scope;
        this.parent = parent;
        
        this.get = function(identifier){
          if (identifier in this.scope) {
              return this.scope[identifier];
          } else if (this.parent !== undefined) {
              return this.parently.get(indentifier); // recursive to the top.
          }
        };
    }
    
    var interpretList = function(input, context) {
        
        // non-special form
        console.log("before:", input);
        var list = input.map( // interpret every node in the list
            function(x) { 
                return interpret(x, context); 
            }               );
        console.log("after: ", list);
        if (list[0] instanceof Function) { // invoke the function
            console.log("list:", list);
            var newlist = list.slice(1);
            console.log("newlist:", newlist);
            // each array element maps to a variable in the function, like intrinsics 
            var myres = list[0].apply(undefined, list.slice(1)); 
            console.log(myres);
            return myres;
        }
    }
    
    var interpret = function(input, context) {
        if(context === undefined) {
            return interpret(input, new Context(library) )
        }
        if(input instanceof Array) {
            return interpretList(input); // recursive decent
        } else if (input.type === "identifier") {
            return context.get(input.value);
        } else if (input.type === "number") {
            return input.value;
        }
        
    }
    
    // Main Loop
    function main(){
        tokenArray = sourceCode.replace(/\(/g, " ( ")
                               .replace(/\[/g, " [ ")
                               .replace(/\]/g, " ] ")
                               .replace(/\)/g, " ) ")
                               .trim()
                               .split(/\s+/);
        console.log(tokenArray);

        ast = parenthesize(tokenArray);
        console.log(ast);

        var res = interpret(ast);
        console.log(res);

        drawAll();
    }
    //setInterval(drawAll, 16);  // run faster for debugging
    document.addEventListener('DOMContentLoaded', main, false); // start when ready
})   ();
