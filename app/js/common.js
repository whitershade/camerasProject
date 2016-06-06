(function () {
  'use strict';
  /*jslint plusplus: true */
  var canvas = document.getElementById("myCanvas"),
    lineWidthInput = document.getElementById("lineWidthInput"),
    lineColorSelect = document.getElementById("lineColorSelect"),
    determineTheScaleButton = document.getElementById("determineTheScale"),
    undoButton = document.getElementById("undoButton"),
    saveButton = document.getElementById("saveButton"),
    deleteLastCameraButton = document.getElementById("deleteLastCamera"),
    clearAllButton = document.getElementById("clearAllButton"),
    areaOfBuilidngP = document.getElementById("areaOfBuilidng"),
    determineAreaButton = document.getElementById("determineArea"),
    areaOfProtectionP = document.getElementById("areaOfProtection"),
    checkSizeButton = document.getElementById("checkSize"),
    testButton = document.getElementById("test"),
    unionTestButton = document.getElementById("unionTest"),
    gaTestButton = document.getElementById("gaTest"),
    camerasP = document.getElementById("cameras"),
    context = canvas.getContext('2d'),

    onDraw = false,
    determineTheScaleClicked = false,
    determineAreaFirstPoint = true,
    determineAreaFinished,
    lineToDraw,
    drawPoint,
    startPoint,
    lineWidth = lineWidthInput.value,
    lineColor = lineColorSelect.value,
    lines = localStorage.lines ? JSON.parse(localStorage.lines) : [],
    areaPoints = localStorage.areaPoints ? JSON.parse(localStorage.areaPoints) : [],
    cameraPoints = [],
    cameraPopulation = [],
    distance,
    widthOfDistanceLine,
    scale = localStorage.scale,

    // color support 
    cameraLineColor = "mediumseagreen",
    deadZoneLineColor = "#FF3333",

    // ga support
    lastParent,
    parents = [],

    // images support
    img = new Image(),
    TO_RADIANS = Math.PI / 180,

    // cameras
    camera1 = {
      name: "Tecasar B-700SN-1",
      matrixH: 4.52,
      rezolution: 700,
      ratio: "4/3",
      minfocus: 2.4,
      maxfocus: 12,
      price: 1108
    },
    camera2 = {
      name: "Alfa M508-A",
      matrixH: 3.39,
      rezolution: 700,
      ratio: "4/3",
      minfocus: 3.6,
      maxfocus: 3.6,
      price: 784
    },
    camera3 = {
      name: "GV-CB220",
      matrixH: 5.42,
      rezolution: 700,
      ratio: "4/3",
      minfocus: 3.35,
      maxfocus: 3.35,
      price: 1000
    },
    cameras = [],
    camerasToDraw = [],
    deadZonesToDraw = [],

    // messages
    messages = [];

  Array.prototype.min = function () {
    return Math.min.apply(null, this);
  };
  // КОНСТРУКТОРЫ
  function PointConstructor(x, y) {
    this.x = x;
    this.y = y;
  } // конструктор точек

  function LineConstructor(startPoint, drawPoint, lineWidth, color) {
    this.x1 = startPoint.x;
    this.y1 = startPoint.y;
    this.x2 = drawPoint.x;
    this.y2 = drawPoint.y;
    this.lineWidth = lineWidth;
    this.color = color;
  } // конструктор линий

  function CameraConstructor(name, x, y, r, deg, arrayOfPoints, lines, areaOfVisibility, focus, matrixH, price, fitness) {
    this.name = name;
    this.x = x;
    this.y = y;
    this.r = r;
    this.deg = deg;
    this.arrayOfPoints = arrayOfPoints;
    this.lines = lines;
    this.areaOfVisibility = areaOfVisibility;
    this.focus = focus;
    this.matrixH = matrixH;
    this.price = price;
    this.fitness = fitness;
  } // конструктор камер

  CameraConstructor.prototype.describeCamera = function () {
    return ("Описание камеры: имя: " + this.name + ", x = " + this.x + ", y = " + this.y + ", угол: " + (this.deg * 180 / Math.PI) + ", фокус: " + this.focus +
      " Площадь обзора: " + (this.areaOfVisibility) + " цена: " + this.price + ", fitness: " + this.fitness + ".");
  };

  function MessageConstructor(message, x, y) {
    this.message = message;
    this.x = x;
    this.y = y;
  }

  function writeMessage(message, x, y) {
    context.font = '18px Calibri';
    context.fillStyle = 'yellow';
    context.fillText(message, x - 30, y - 10);
  } // функция для вывода текстового сообщения

  function drawTextBG(message, x, y) {
    x = x + 20;
    y = y + 5;
    context.save();
    context.font = '25px Calibri';
    context.textBaseline = 'top';
    context.fillStyle = '#596273';
    var width = context.measureText(message).width;
    context.fillRect(x, y, 30, parseInt('30px Calibri', 10));
    context.fillStyle = '#DCE4E7';
    context.fillText(message, x + 9, y);
    context.restore();
  }

  function outputCameras() {
    camerasP.innerHTML = '';
    camerasToDraw.forEach(function (item, i) {
      var newP = document.createElement('p');
      newP.innerHTML = (i + 1) + ") " + item.describeCamera();
      camerasP.appendChild(newP);
    });
  }

  function getMousePos(canvas, evt) {
    var rect = canvas.getBoundingClientRect();
    return {
      x: evt.clientX - rect.left,
      y: evt.clientY - rect.top
    };
  } // определение положения курсора на canvas

  function pointOfIntersection(line1, line2) {
    var xo = line1.x1,
      yo = line1.y1,
      p = line1.x2 - line1.x1,
      q = line1.y2 - line1.y1,
      x1 = line2.x1,
      y1 = line2.y1,
      p1 = line2.x2 - line2.x1,
      q1 = line2.y2 - line2.y1,
      x = (xo * q * p1 - x1 * q1 * p - yo * p * p1 + y1 * p * p1) / (q * p1 - q1 * p),
      y = (yo * p * q1 - y1 * p1 * q - xo * q * q1 + x1 * q * q1) / (p * q1 - p1 * q);
    return new PointConstructor(x, y);
  } // возвращает точку пересечения

  function twoLinesIntersection(line1, line2) {
    var v1,
      v2,
      v3,
      v4;
    if (line1.color === cameraLineColor && line2.color === cameraLineColor) {
      return false;
    }
    if (line1.color === deadZoneLineColor && line2.color === "blueviolet") {
      return false;
    }
    if (line1.color === cameraLineColor && line2.color === "blueviolet") {
      return false;
    }
    v1 = (line2.x2 - line2.x1) * (line1.y1 - line2.y1) - (line2.y2 - line2.y1) * (line1.x1 - line2.x1);
    v2 = (line2.x2 - line2.x1) * (line1.y2 - line2.y1) - (line2.y2 - line2.y1) * (line1.x2 - line2.x1);
    v3 = (line1.x2 - line1.x1) * (line2.y1 - line1.y1) - (line1.y2 - line1.y1) * (line2.x1 - line1.x1);
    v4 = (line1.x2 - line1.x1) * (line2.y2 - line1.y1) - (line1.y2 - line1.y1) * (line2.x2 - line1.x1);
    return ((v1 * v2 <= 0) && (v3 * v4 <= 0));
  } // пересекаются ли две линии

  function checkCameraLinesIntersection(treangleLine) {
    var point = new PointConstructor(treangleLine.x, treangleLine.y);
    lines.forEach(function (item) {
      if (twoLinesIntersection(treangleLine, item)) {
        var pointIntersection = pointOfIntersection(treangleLine, item);
        treangleLine.x2 = pointIntersection.x;
        treangleLine.y2 = pointIntersection.y;
        point.x = pointIntersection.x.toFixed(2);
        point.y = pointIntersection.y.toFixed(2);
      }
    });
    cameraPoints.push(point);
  } // проверяет, пересекаются ли линии камер с чем-нибудь кроме себя, если пересекаются, то обрезает угол их обзора

  function drawCircle(x, y, radius, color) {
    context.fillStyle = color;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2, false);
    context.closePath();
    context.fill();
  } // функция для рисования окружности

  function drawLine(line) {
    context.beginPath();
    context.strokeStyle = line.color;
    context.moveTo(line.x1, line.y1);
    context.lineTo(line.x2, line.y2);
    context.lineWidth = line.lineWidth;
    context.stroke();
  } // функция для рисования линии

  function drawPolygon(arrayOfPoints, fill) {
    // Начинаем отрисовку 
    context.beginPath();
    arrayOfPoints.forEach(function (item, i) {
      if (i === 0) {
        context.moveTo(item.x, item.y);
      } else {
        context.lineTo(item.x, item.y);
      }
    });
    context.fillStyle = fill;
    context.fill();
  } // функция для отрисовки многоугольника

  function draw() {
    var i;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "rgba(100,150,185,0.3)";
    context.fillRect(0, 0, canvas.width, canvas.height);
    for (i = lines.length - 1; i >= 0; i -= 1) {
      drawLine(lines[i]);
    }
    if (determineAreaFinished) {
      drawPolygon(areaPoints, "rgba(255,128,128,0.2)");
    }
    camerasToDraw.forEach(function (item) {
      item.drawCamera();
    });
    deadZonesToDraw.forEach(function (item) {
      item.drawCamera();
    });
    messages.forEach(function (item) {
      drawTextBG(item.message, item.x, item.y);
    });
  } // функция для отрисовки содержимого экрана

  function drawAfter() {
    var i;
    for (i = lines.length - 1; i >= 0; i -= 1) {
      drawLine(lines[i]);
    }
  } // отрисовывает стены после всех изменений

  function drawRotatedImage(image, x, y, angle) {

    // save the current co-ordinate system 
    // before we screw with it
    context.save();

    // move to the middle of where we want to draw our image
    context.translate(x, y);

    // rotate around that point, converting our 
    // angle from degrees to radians 
    context.rotate(angle * TO_RADIANS);

    // draw it up and to the left by half the width
    // and height of the image 
    context.drawImage(image, -(image.width / 2), -(image.height / 2));

    // and restore the co-ords to how they were when we began
    context.restore();
  } // функция для отрисовки повернутого изображения

  function drawImage(img, x, y, angle) {
    img.src = "img/camera1.png";
    img.onload = function () {
      drawRotatedImage(img, x, y, angle);
    };
  } // функция для отрисовки изображения для canvas

  function drawDeadZone(camera) {
    cameraPoints = [];
    var cameraLines = [],
      focus = camera.focus,
      randomX = camera.x,
      randomY = camera.y,
      startPoint = new PointConstructor(randomX, randomY),
      horizontalDeg = Math.abs(2 * (Math.PI / 2 - Math.atan((camera.matrixH / (2 * focus))) * 180 / Math.PI)),
      a = horizontalDeg / 37.5,
      r = 30,
      deg = camera.deg - 41 * a / 2 * (Math.PI / 180),
      finishPoint,
      treangleLine,
      i;
    cameraPoints.push(startPoint);
    finishPoint = new PointConstructor((randomX + Math.sin(deg) * r), randomY + Math.cos(deg) * r);
    treangleLine = new LineConstructor(startPoint, finishPoint, 2, deadZoneLineColor);
    checkCameraLinesIntersection(treangleLine);
    cameraLines.push(treangleLine);
    for (i = 1; i < 42; i += 1) {
      finishPoint = new PointConstructor((randomX + Math.sin(deg + (Math.PI / 180) * a * i) * r), randomY + Math.cos(deg + (Math.PI / 180) * a * i) * r);
      var treangleLines = new LineConstructor(startPoint, finishPoint, 2, deadZoneLineColor);
      checkCameraLinesIntersection(treangleLines);
      cameraLines.push(treangleLines);
    }
    var area = calcPolygonArea(cameraPoints);
    deadZonesToDraw.push(new CameraConstructor(camera.name, randomX, randomY, r, deg + 39 * a / 2 * (Math.PI / 180), cameraPoints, cameraLines, area, focus, camera.matrixH, camera.price, area / camera.price));
    draw();
  }

  CameraConstructor.prototype.drawCamera = function () {
    var img = new Image();
    this.lines.forEach(function (item) {
      drawLine(item);
    });
    drawPolygon(this.arrayOfPoints, "rgba(60,179,113, 0.2)");
    drawImage(img, this.x, this.y, this.deg * (-180) / Math.PI);
  }; // учит камеру рисовать себя

  function determineTheScaleButtonOff() {
    determineTheScaleButton.style.backgroundColor = "buttonface";
    lineColor = lineColorSelect.value;
    determineTheScaleClicked = false;
  } // выключает кнопку определения масштаба

  function lineSize(line) {
    return Math.sqrt(Math.pow((line.x2 - line.x1), 2) + Math.pow((line.y2 - line.y1), 2));
  } // возвращает длину линии

  function calcPolygonArea(points) {
    var total = 0,
      i,
      l,
      addX,
      addY,
      subX,
      subY;

    for (i = 0, l = points.length; i < l; i += 1) {
      addX = points[i].x;
      addY = points[i === points.length - 1 ? 0 : i + 1].y;
      subX = points[i === points.length - 1 ? 0 : i + 1].x;
      subY = points[i].y;

      total += (addX * addY * 0.5);
      total -= (subX * subY * 0.5);
    }

    return Math.abs(total);
  } // возвращает площадь многоугольника

  function changeAreaOfBuilidngP() {
    if (scale) {
      areaOfBuilidngP.innerText = "Размеры помещения: " + (scale * canvas.width).toFixed(2) + ", м x " + (scale * canvas.height).toFixed(2) + ", м";
    } else {
      areaOfBuilidngP.innerText = "Размеры помещения:";
    }
  } // обновляет p с размерами помещения

  function changeAreaOfProtectioin() { // обновляет p с размерами исследуемой зоны
    areaOfProtectionP.innerText = "Площадь исследуемой зоны: " + (calcPolygonArea(areaPoints) * scale * scale).toFixed(2) + ", м2.";
  } // обновляет p с размерами исследуемой зоны 

  function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  } // возвращает случайное целое число из указанного диапазона

  function getRandomFloat(min, max) {
    return Math.random() * (max - min) + min;
  } // возвращает случайное не целое число из указанного диапазона

  function poligonContainsPoint(point, areaPoints) {
    var x = point.x,
      y = point.y,
      inside = false,
      i,
      j,
      xi,
      yi,
      xj,
      yj,
      intersect;
    for (i = 0, j = areaPoints.length - 1; i < areaPoints.length; j = i++) {
      xi = areaPoints[i].x;
      yi = areaPoints[i].y;
      xj = areaPoints[j].x;
      yj = areaPoints[j].y;
      intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (intersect) {
        inside = !inside;
      }
    }

    return inside;
  } // проверяет, находится ли точка в указанном многоугольнике 

  function createPolygonTreangle(deg, r) {
    cameraPoints = [];
    var randomX = getRandomInt(0, canvas.width),
      randomY = getRandomInt(0, canvas.height),
      startPoint = new PointConstructor(randomX, randomY),
      finishPoint,
      treangleLine,
      a,
      i,
      treangleLines;
    if (!poligonContainsPoint(startPoint, areaPoints)) {
      createPolygonTreangle(deg, r);
    } else {
      cameraPoints.push(startPoint);
      finishPoint = new PointConstructor((randomX + Math.sin(deg) * r), randomY + Math.cos(deg) * r);
      treangleLine = new LineConstructor(startPoint, finishPoint, 2, cameraLineColor);
      checkCameraLinesIntersection(treangleLine);
      drawLine(treangleLine);
      a = 5;
      for (i = 1; i < 11; i += 1) {
        finishPoint = new PointConstructor((randomX + Math.sin(deg + (Math.PI / 180) * a * i) * r), randomY + Math.cos(deg + (Math.PI / 180) * a * i) * r);
        treangleLines = new LineConstructor(startPoint, finishPoint, 2, cameraLineColor);
        checkCameraLinesIntersection(treangleLines);
        drawLine(treangleLines);
      }
      console.log(calcPolygonArea(cameraPoints));
      drawPolygon(cameraPoints, "rgba(255,128,128,0.5)");
    }
  }

  function getCamera(name, x, y, r, deg, focus, matrixH, price) {
    cameraPoints = [];
    draw();
    var cameraLines = [],
      randomX = x,
      randomY = y,
      startPoint = new PointConstructor(randomX, randomY),
      i;
    cameraPoints.push(startPoint);
    var finishPoint = new PointConstructor((randomX + Math.sin(deg) * r), randomY + Math.cos(deg) * r);
    var treangleLine = new LineConstructor(startPoint, finishPoint, 2, cameraLineColor);
    checkCameraLinesIntersection(treangleLine);
    cameraLines.push(treangleLine);
    var horizontalDeg = Math.abs(2 * (Math.PI / 2 - Math.atan((matrixH / (2 * focus))) * 180 / Math.PI));
    var a = horizontalDeg / 37.5;
    for (i = 1; i < 41; i += 1) {
      finishPoint = new PointConstructor((randomX + Math.sin(deg + (Math.PI / 180) * a * i) * r), randomY + Math.cos(deg + (Math.PI / 180) * a * i) * r);
      var treangleLines = new LineConstructor(startPoint, finishPoint, 2, cameraLineColor);
      checkCameraLinesIntersection(treangleLines);
      cameraLines.push(treangleLines);
    }
    //    console.log(calcPolygonArea(cameraPoints));
    if (isNaN(calcPolygonArea(cameraPoints))) {
      return false;
    }
    var area = calcPolygonArea(cameraPoints);
    return (new CameraConstructor(name, randomX, randomY, r, deg + 39 * a / 2 * (Math.PI / 180), cameraPoints, cameraLines, area, focus, matrixH, price, area / price));
  }

  function getRandomCamera() {
    cameraPoints = [];
    var cameraLines = [];
    var camera = cameras[getRandomInt(0, cameras.length - 1)];
    var focus = getRandomFloat(camera.minfocus, camera.maxfocus);
    focus = focus.toFixed(1);
    focus = camera.minfocus;
    draw();
    var randomX = getRandomInt(0, canvas.width);
    var randomY = getRandomInt(0, canvas.height);
    var startPoint = new PointConstructor(randomX, randomY);
    var horizontalDeg = Math.abs(2 * (Math.PI / 2 - Math.atan((camera.matrixH / (2 * focus))) * 180 / Math.PI));
    if (!poligonContainsPoint(startPoint, areaPoints)) {
      getRandomCamera();
    } else {
      var r = 1000;
      var deg = getRandomInt(0, 360) * Math.PI / 180;
      cameraPoints.push(startPoint);
      var finishPoint = new PointConstructor((randomX + Math.sin(deg) * r), randomY + Math.cos(deg) * r);
      var treangleLine = new LineConstructor(startPoint, finishPoint, 2, cameraLineColor);
      checkCameraLinesIntersection(treangleLine);
      cameraLines.push(treangleLine);
      var a = horizontalDeg / 37.5;
      for (var i = 1; i < 41; i += 1) {
        finishPoint = new PointConstructor((randomX + Math.sin(deg + (Math.PI / 180) * a * i) * r), randomY + Math.cos(deg + (Math.PI / 180) * a * i) * r);
        var treangleLines = new LineConstructor(startPoint, finishPoint, 2, cameraLineColor);
        checkCameraLinesIntersection(treangleLines);
        cameraLines.push(treangleLines);
      }
      var area = calcPolygonArea(cameraPoints);
      if (camerasToDraw.length > 0) {
        return new CameraConstructor(camera.name, randomX, randomY, r, deg + 39 * a / 2 * (Math.PI / 180), cameraPoints, cameraLines, area, focus, camera.matrixH, camera.price, area / camera.price);
      }
      return new CameraConstructor(camera.name, randomX, randomY, r, deg + 39 * a / 2 * (Math.PI / 180), cameraPoints, cameraLines, area, focus, camera.matrixH, camera.price, area / camera.price);
    }
  }

  // ГЕНЕТИЧЕСКИЙ АЛГОРИТМ

  function ga() {
    var populationCount = 100, // 200, 30
      countOfGenerations = 50, // 100, 10
      fitness = 0;
    cameraPopulation = [];
    // создание начальной популяции
    intitalPopulation(populationCount);
    cameraPopulation.forEach(function (item) {
      fitness += item.fitness;
    });
    console.log("средний фитнесс начальной генерации " + fitness / cameraPopulation.length);
    if (fitness / cameraPopulation.length === 0) {
      console.log("Дальнейшее моделирование не имеет смысла!");
      drawAfter();
      return;
    }
    for (var i = 0; i < countOfGenerations; i++) {
      selection(populationCount);
      var winner = new CameraConstructor();
      winner.fitness = 0;
      cameraPopulation.forEach(function (item) {
        if (item.fitness > winner.fitness) {
          winner = item;
        }
      });
      fitness = 0;
      cameraPopulation.forEach(function (item) {
        fitness += item.fitness;
      });
      console.log(winner.describeCamera());
    }
    camerasToDraw.push(winner);
    winner.drawCamera();
    drawDeadZone(winner);
    console.log(winner.describeCamera());
    console.log("Площадь исследуемой зоны: " + (calcPolygonArea(areaPoints) * scale * scale).toFixed(2));
    drawAfter();
    messages.push(new MessageConstructor(camerasToDraw.length, camerasToDraw[camerasToDraw.length - 1].x,
      camerasToDraw[camerasToDraw.length - 1].y));
    messages.forEach(function (item) {
      drawTextBG(item.message, item.x, item.y);
    });
    outputCameras();
  }

  function intitalPopulation(countOfPopulation) {
    var camera;
    for (var i = 0; i < countOfPopulation; i++) {
      camera = getRandomCamera();
      if (camera === undefined) {
        i -= 1;
      } else if (isNaN(camera.areaOfVisibility)) {
        i -= 1;
      } else {
        if (camerasToDraw.length > 0) {
          camera.areaOfVisibility = getUsefulAreaOfVisibility2(camera);
          camera.fitness = camera.areaOfVisibility / camera.price;
        }
        cameraPopulation.push(camera);
      }
    }
  }

  function chanceCounter(camera) {
    var multi = 0; //делитель

    cameraPopulation.forEach(function (item) {
      if (item === undefined) {
        return 0;
      }
      multi += item.fitness;
    });

    return (camera.fitness) / multi;
  }

  function getParent(first, populationCount) {
    if (first) {
      var chance = getRandomInt(0, 100);
      var counter = 0;
      var array = [];
      for (var i = 0; i < populationCount; i++) {
        array[counter] = Math.abs(chanceCounter(cameraPopulation[i]) - chance);
        counter++;
      }
      counter = 0;
      lastParent = cameraPopulation[array.indexOf(array.min())];
      return (lastParent);
    } else {
      var index = cameraPopulation.indexOf(lastParent);
      if (index > -1) {
        cameraPopulation.splice(index, 1);
      }
      var chance = getRandomInt(0, 100);
      var counter = 0;
      var array = [];
      for (var i = 0; i < populationCount - 1; i++) {
        array[counter] = Math.abs(chanceCounter(cameraPopulation[i]) - chance);
        counter++;
      }
      counter = 0;
      cameraPopulation.push(lastParent);
      return (cameraPopulation[array.indexOf(array.min())]);
    }
  }

  function selection(populationCount) {
    parents = [];
    for (var i = 0; i < populationCount; i = i + 1) {
      parents.push(getParent(true, populationCount));
      parents.push(getParent(false, populationCount));
    }
    for (i = 0; i < populationCount; i = i + 2) {
      cameraPopulation.shift();
      cameraPopulation.push(crossOver(parents[i], parents[i + 1]));
    }
  }

  function crossOver(parent1, parent2) {
    if (parent2 === undefined) {
      return parent1;
    }
    var newChild = new CameraConstructor();
    var chance = getRandomInt(0, 1);
    if (chance === 1) {
      newChild.x = parent1.x;
    } else newChild.x = parent2.x;
    chance = getRandomInt(0, 1);
    if (chance === 1) {
      newChild.y = parent1.y;
    } else newChild.y = parent2.y;
    chance = getRandomInt(0, 1);
    if (chance === 1) {
      newChild.deg = parent1.deg;
    } else newChild.deg = parent2.deg;
    chance = getRandomInt(0, 1);
    if (chance === 1) {
      newChild.r = parent1.r;
    } else newChild.r = parent2.r;
    chance = getRandomInt(0, 1);
    if (chance === 1) {
      newChild.name = parent1.name;
      newChild.matrixH = parent1.matrixH;
      newChild.focus = parent1.focus;
      newChild.price = parent1.price;
    } else {
      newChild.name = parent2.name;
      newChild.matrixH = parent2.matrixH;
      newChild.focus = parent2.focus;
      newChild.price = parent2.price;
    }
    chance = getRandomInt(0, 100);
    if (chance >= 85) {
      do {
        newChild = getRandomCamera();
        if (newChild !== undefined && !isNaN(newChild.areaOfVisibility)) {
          if (camerasToDraw.length > 0) {
            newChild.areaOfVisibility = getUsefulAreaOfVisibility2(newChild);
            newChild.fitness = newChild.areaOfVisibility / newChild.price;
          }
          break;
        }
      } while (true);
    }
    newChild = getCamera(newChild.name, newChild.x, newChild.y, newChild.r, newChild.deg,
      newChild.focus, newChild.matrixH, newChild.price);
    if (newChild === false || newChild === undefined) {
      return parent1;
    }
    if (camerasToDraw.length > 0) {
      newChild.areaOfVisibility = getUsefulAreaOfVisibility2(newChild);
      newChild.fitness = newChild.areaOfVisibility / newChild.price;
    }
    return newChild;
  }

  // turf 

  function getArrayOfTurfPolygon(arrayOfPoints) {
    var arrayOfTurfPolygon = [];
    arrayOfPoints.forEach(function (item) {
      arrayOfTurfPolygon.push([item.x, item.y]);
    });
    arrayOfTurfPolygon.push([arrayOfPoints[0].x, arrayOfPoints[0].y]);
    return arrayOfTurfPolygon;
  }

  function getArrayPointOfUnionPolygon(turfPolygon) {
    var arrayOfPoints = [];
    turfPolygon.geometry.coordinates[0].forEach(function (item) {
      arrayOfPoints.push(new PointConstructor(item[0], item[1]))
    });
    return arrayOfPoints;
  }

  function getUsefulAreaOfVisibility(camera1, camera2) {
    var turfPolygon1 = turf.polygon([
      getArrayOfTurfPolygon(camera1.arrayOfPoints)
      ], {
        "fill": "#6BC65F",
        "stroke": "#6BC65F",
        "stroke-width": 5
      }),
      turfPolygon2 = turf.polygon([
      getArrayOfTurfPolygon(camera2.arrayOfPoints)
      ], {
        "fill": "#6BC65F",
        "stroke": "#6BC65F",
        "stroke-width": 5
      }),
      unionPolygon = turf.union(turfPolygon1, turfPolygon2);
    if (unionPolygon.geometry.type === "MultiPolygon") {
      //      console.log("Камера 1 площадь видимости: " + camera1.areaOfVisibility);
      //      console.log("Камера 2 площадь видимости: " + camera2.areaOfVisibility);
      //      console.log("Общая площадь видимости: " +
      //        (camera1.areaOfVisibility + camera2.areaOfVisibility));
      //      console.log("Полезная площадь видимости 2-ой камеры: " + camera2.areaOfVisibility);
      return camera2.areaOfVisibility;
    } else {
      //      console.log("Камера 1 площадь видимости: " + camera1.areaOfVisibility);
      //      console.log("Камера 2 площадь видимости: " + camera2.areaOfVisibility);
      //      console.log("Общая площадь видимости: " +
      //        calcPolygonArea(getArrayPointOfUnionPolygon(unionPolygon)));
      //      console.log("Полезная площадь видимоcти 2-ой камеры: " +
      //        (calcPolygonArea(getArrayPointOfUnionPolygon(unionPolygon)) - camera1.areaOfVisibility));
      return (calcPolygonArea(getArrayPointOfUnionPolygon(unionPolygon)) - camera1.areaOfVisibility);
    }
  } // возвращает полезную видимость второй камеры

  function getUselessAreaOfVisibility(camera1, camera2) {
    var turfPolygon1 = turf.polygon([
      getArrayOfTurfPolygon(camera1.arrayOfPoints)
      ], {
        "fill": "#6BC65F",
        "stroke": "#6BC65F",
        "stroke-width": 5
      }),
      turfPolygon2 = turf.polygon([
      getArrayOfTurfPolygon(camera2.arrayOfPoints)
      ], {
        "fill": "#6BC65F",
        "stroke": "#6BC65F",
        "stroke-width": 5
      }),
      unionPolygon = turf.union(turfPolygon1, turfPolygon2),
      areaOfUnionPolygon = calcPolygonArea(getArrayPointOfUnionPolygon(unionPolygon));
    if (isNaN(areaOfUnionPolygon)) {
      return 0;
    }
    //    console.log(calcPolygonArea(camera1.arrayOfPoints) + " " + calcPolygonArea(camera2.arrayOfPoints) + " " + areaOfUnionPolygon);
    return (calcPolygonArea(camera1.arrayOfPoints) + calcPolygonArea(camera2.arrayOfPoints) - areaOfUnionPolygon);
  }

  function getUsefulAreaOfVisibility2(camera) {
    var useFullArea,
      uselessArea;
    uselessArea = 0;
    for (var i = 0; i < camerasToDraw.length; i += 1) {
      uselessArea += getUselessAreaOfVisibility(camera, camerasToDraw[i]);
    }
    useFullArea = calcPolygonArea(camera.arrayOfPoints) - uselessArea;
    if (useFullArea < 0)
      return 0;
    return useFullArea;
  }

  function getUsefulAreaOfVisibilityPointsArray(camera1, camera2) {
    var turfPolygon1 = turf.polygon([
      getArrayOfTurfPolygon(camera1.arrayOfPoints)
      ], {
        "fill": "#6BC65F",
        "stroke": "#6BC65F",
        "stroke-width": 5
      }),
      turfPolygon2 = turf.polygon([
      getArrayOfTurfPolygon(camera2.arrayOfPoints)
      ], {
        "fill": "#6BC65F",
        "stroke": "#6BC65F",
        "stroke-width": 5
      }),
      unionPolygon = turf.union(turfPolygon1, turfPolygon2);
    return getArrayPointOfUnionPolygon(unionPolygon);
  }

  if (localStorage.determineAreaFinished === "true") {
    determineAreaFinished = true;
    changeAreaOfProtectioin();
  } else {
    determineAreaFinished = false;
  }
  draw();
  if (scale) {
    changeAreaOfBuilidngP();
  }
  cameras.push(camera1);
  cameras.push(camera2);
  cameras.push(camera3);

  // ОБРАБОТЧИКИ СОБЫТИЙ
  canvas.addEventListener("mousemove", function (evt) {
    var mousePos = getMousePos(canvas, evt),
      message;
    drawPoint = new PointConstructor(mousePos.x, mousePos.y);
    message = 'Mouse position: ' + drawPoint.x + ',' + drawPoint.y;
    if (onDraw) {
      draw();
      writeMessage(canvas, message);
      lineToDraw = new LineConstructor(startPoint, drawPoint, lineWidth, lineColor);
      drawLine(lineToDraw);
    }
    //    writeMessage(canvas, message);
  }, false);

  undoButton.addEventListener("click", function () {
    if (lines.length > 0) {
      lines.pop();
      draw();
    }
  });

  lineWidthInput.addEventListener("change", function () {
    lineWidth = lineWidthInput.value;
  });

  lineColorSelect.addEventListener("change", function () {
    lineColor = lineColorSelect.value;
  });

  determineTheScaleButton.addEventListener("click", function () {
    if (!determineTheScaleClicked) {
      this.style.backgroundColor = "lightblue";
      lineColor = "lightblue";
      determineTheScaleClicked = true;
    } else {
      determineTheScaleButtonOff();
    }
  });

  determineAreaButton.addEventListener("click", function () {
    this.style.backgroundColor = "lightblue";
    lineColor = "blueviolet";
    lineWidth = 3;
  });

  checkSizeButton.addEventListener("click", function () {
    this.style.backgroundColor = "lightblue";
    lineColor = "thistle";
    lineWidth = 3;
  });

  testButton.addEventListener("click", function () {
    //    createPolygonTreangle(getRandomInt(0, 100) + Math.PI / 100, 400);
    //    createPolygonTreangle(getRandomInt(0, 100) + Math.PI / 100, 400);
    draw();
    do {
      var camera = getRandomCamera();
      if (camera !== undefined) {
        cameraPopulation.push(camera);
        break;
      }
    } while (true);
    var testCamera = cameraPopulation[cameraPopulation.length - 1];
    testCamera.drawCamera();
    camerasToDraw.push(testCamera);
    drawDeadZone(testCamera);
    console.log(testCamera.describeCamera());
    messages.push(new MessageConstructor(camerasToDraw.length, camerasToDraw[camerasToDraw.length - 1].x,
      camerasToDraw[camerasToDraw.length - 1].y));
    messages.forEach(function (item) {
      drawTextBG(item.message, item.x, item.y);
    })
    console.log(messages);
  });

  unionTestButton.addEventListener("click", function () {
    var useFullArea,
      uselessArea;
    if (camerasToDraw.length === 1) {
      useFullArea = calcPolygonArea(camerasToDraw[0].arrayOfPoints);
    } else {
      uselessArea = 0;
      for (var i = 0; i < camerasToDraw.length - 1; i += 1) {
        uselessArea += getUselessAreaOfVisibility(camerasToDraw[camerasToDraw.length - 1], camerasToDraw[i]);
      }
      useFullArea = calcPolygonArea(camerasToDraw[camerasToDraw.length - 1].arrayOfPoints) - uselessArea;
    }
    console.log(useFullArea);
  });

  gaTestButton.addEventListener("click", function () {
    ga();
  });

  saveButton.addEventListener("click", function () {
    localStorage.lines = JSON.stringify(lines);
    if (scale) {
      localStorage.scale = scale;
    }
    if (determineAreaFinished) {
      localStorage.areaPoints = JSON.stringify(areaPoints);
      localStorage.determineAreaFinished = "true";
    }
  });

  deleteLastCameraButton.addEventListener("click", function () {
    if (camerasToDraw.length > 0) {
      camerasToDraw.pop();
      deadZonesToDraw.pop();
      messages.pop();
      draw();
      drawAfter();
      
    }
  });

  clearAllButton.addEventListener("click", function () {
    lines = [];
    areaPoints = [];
    scale = undefined;
    determineAreaFinished = false;
    changeAreaOfBuilidngP();
    localStorage.areaPoints = JSON.stringify(areaPoints);
    //localStorage.scale = scale;
    draw();
  });

  canvas.addEventListener("mousedown", function () {
    onDraw = true;
    startPoint = new PointConstructor(drawPoint.x, drawPoint.y);
  });

  canvas.addEventListener("click", function (e) {
    if (e.ctrlKey) {
      onDraw = false;
      lineColor = lineColorSelect.value;
      lineWidth = lineWidthInput.value;
      lines.pop();
      determineAreaButton.style.backgroundColor = "buttonface";
      determineAreaFinished = true;
      changeAreaOfProtectioin();
      draw();
    }
  });

  canvas.addEventListener("mouseup", function () {
    lines.push(lineToDraw);
    if (lineToDraw.color === "lightblue") {
      distance = prompt("Введите расстояние в метрах:");
      widthOfDistanceLine = lineSize(lineToDraw);
      lines.pop();
      draw();
      determineTheScaleButtonOff();
      widthOfDistanceLine = Number(widthOfDistanceLine);
      scale = distance / widthOfDistanceLine;
      changeAreaOfBuilidngP();
      onDraw = false;
    } else if (lineToDraw.color === "blueviolet") {
      if (determineAreaFirstPoint) {
        areaPoints.push(startPoint);
        startPoint = drawPoint;
        determineAreaFirstPoint = false;
      }
      areaPoints.push(drawPoint);
    } else if (lineToDraw.color === "thistle") {
      alert((lineSize(lines[lines.length - 1]) * scale).toFixed(2) + ", м");
      checkSizeButton.style.backgroundColor = "buttonface";
      lines.pop();
      onDraw = false;
      draw();
    } else {
      onDraw = false;
    }
  });

}());