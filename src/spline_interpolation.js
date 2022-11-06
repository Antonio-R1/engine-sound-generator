
/*
 * Copyright (c) 2021-2022 Antonio-R1
 * License: https://github.com/Antonio-R1/engine-sound-generator/blob/main/LICENSE | MIT
 */

class Matrix2d {
   constructor (rows, cols) {
      this.rows = rows;
      this.cols = cols;
      this.array = new Float64Array (rows*cols);
   }

   get (row, col) {
      return this.array[row*this.cols+col];
   }

   set (row, col, value) {
      this.array[row*this.cols+col] = value;
   }

   toString () {
      var string = "Matrix2d\n";
      for (var i=0; i<this.rows; i++) {
         for (var j=0; j<this.cols; j++) {
            string += this.get (i, j)+" ";
         }
         if (i<this.rows-1) {
            string += "\n"
         }
      }
      return string;
   }
}

class CubicPolynomial {

   /*
    * arguments: the coefficient of the cubic polynomial
    *            f(x) = a+b*x+c*x^2+d*x^3
    */
   constructor (a, b, c, d) {
      this.a = a;
      this.b = b;
      this.c = c;
      this.d = d;
   }

   evaluate (x) {
      return this.a+x*(this.b+x*(this.c+x*this.d));
   }

}

class SplineInterpolation {

   subtractMatrixRows (matrix, currentRow, currentCol) {
      var factor = matrix.get (currentRow, currentCol)/matrix.get (currentRow-1, currentCol);
      for (var j=currentCol; j<matrix.cols; j++) {
         matrix.set (currentRow, j, matrix.get (currentRow, j)-
                                                factor*matrix.get (currentRow-1, j));
      }
   }

   solveEquations (matrix, sigmaArray) {
      for (var i=1; i<matrix.rows; i++) {
         this.subtractMatrixRows (matrix, i, i-1);
      }

      var lastColIndex = matrix.cols-1;
      for (var i=matrix.rows-1; i>=0; i--) {
         sigmaArray[i+1] = matrix.get (i, matrix.cols-1);
         for (var j = matrix.rows-1; j>i; j--) {
            sigmaArray[i+1] -= matrix.get (i, j)*sigmaArray[j+1];
         }
         sigmaArray[i+1] /= matrix.get (i, i);
      }
   }

   createPolynomialArray (xValues, yValues, sigmaArray) {
      for (var i=0; i<sigmaArray.length-1; i++) {
         var h = xValues[i+1]-xValues[i];
         this.splines[i] = new CubicPolynomial (yValues[i],
                                               (yValues[i+1]-yValues[i])/h-h*(2*sigmaArray[i]+sigmaArray[i+1])/6,
                                               sigmaArray[i]/2,
                                               (sigmaArray[i+1]-sigmaArray[i])/(6*h));
      }
   }

   constructor (xValues, yValues) {

      if (xValues.length != yValues.length) {
         throw new Error ('"xValues" and "yValues" need to have the same length.');
      }

      if (xValues.length < 3) {
         throw new Error ("At least 3 knots need to be passed.");
      }

      this.xValues = xValues;

      var size = xValues.length-1;
      const extendedMatrix = new Matrix2d (size-1, size);
      const sigmaArray = new Float64Array (size+1);
      this.splines = new Array (size);

      var h1 = xValues[1]-xValues[0];
      var h2 = xValues[2]-xValues[1];
      extendedMatrix.set (0, 0, (h1+h2)/3);
      extendedMatrix.set (0, 1, h2/6);
      extendedMatrix.set (0, extendedMatrix.cols-1, (yValues[2]-yValues[1])/h2-
                                                    (yValues[1]-yValues[0])/h1);

      for (var i=1; i<size-1; i++) {
         h1 = xValues[i+1]-xValues[i];
         h2 = xValues[i+2]-xValues[i+1];
         extendedMatrix.set (i, i-1, h1/6);
         extendedMatrix.set (i, i, (h1+h2)/3);
         extendedMatrix.set (i, i+1, h2/6);
         extendedMatrix.set (i, extendedMatrix.cols-1, (yValues[i+2]-yValues[i+1])/h2-
                                                       (yValues[i+1]-yValues[i])/h1);
      }

      if (xValues.length >= 4) {
         h1 = xValues[size-1]-xValues[size-2];
         h2 = xValues[size]-xValues[size-1];
         extendedMatrix.set (extendedMatrix.rows-1, extendedMatrix.rows-2, h1/6);
         extendedMatrix.set (extendedMatrix.rows-1, extendedMatrix.rows-1, (h1+h2)/3);
         extendedMatrix.set (extendedMatrix.rows-1, size-1, (yValues[size]-yValues[size-1])/h2-
                                                            (yValues[size-1]-yValues[size-2])/h1);
      }

      this.solveEquations (extendedMatrix, sigmaArray);

      this.createPolynomialArray (xValues, yValues, sigmaArray);
   }

   evaluate (x) {

      if (x > this.xValues[this.xValues.length-1]) {
         throw new Error ("The value of x has to be between "+this.xValues[0]+
                          " and "+this.xValues[this.xValues.length-1]+".\n"+
                          "current value: "+x);
      }

      for (var i=0; i<this.xValues.length-1; i++) {
         if (this.xValues[i+1]>x)
            break;
      }

      if (i==this.splines.length) {
         i--;
      }

      return this.splines[i].evaluate (x-this.xValues[i]);
   }

}

export default SplineInterpolation;