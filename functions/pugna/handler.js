'use strict';

const printDebug = process.env.PRINT_DEBUG === 'true';

const debug = (message) => {
    if (printDebug) console.log(message);
};

module.exports.ping = (event, context, callback) => {
    const response = {
        statusCode: 200,
        body: 'pong'
    };
    callback(null, response);
};

const pointSquareRelativeTo = (grid) => (target) => {

};

const findInPositions =
    (positions) =>
        (x, y) => {
            const position = {
                coordinate: {x: x, y: y}
            };
            const inBoard = positions.find((point) => point.coordinate.x === x && point.coordinate.y === y);
            if (inBoard) {
                position.playerName = inBoard.playerName;
            }

            return position;
        };

const surroundingPointsInPositions =
    (positions) =>
        (point) => {
            const findPoint = findInPositions(positions);
            return [
                {
                    move: "UP_LEFT",
                    score: 0,
                    point: findPoint(point.coordinate.x - 1, point.coordinate.y + 1)
                },
                {
                    move: "UP",
                    score: 0,
                    point: findPoint(point.coordinate.x, point.coordinate.y + 1)
                },
                {
                    move: "UP_RIGHT",
                    score: 0,
                    point: findPoint(point.coordinate.x + 1, point.coordinate.y + 1)
                },
                {
                    move: "LEFT",
                    score: 0,
                    point: findPoint(point.coordinate.x - 1, point.coordinate.y)
                },
                {
                    move: "RIGHT",
                    score: 0,
                    point: findPoint(point.coordinate.x + 1, point.coordinate.y)
                },
                {
                    move: "DOWN_LEFT",
                    score: 0,
                    point: findPoint(point.coordinate.x - 1, point.coordinate.y - 1)
                },
                {
                    move: "DOWN",
                    score: 0,
                    point: findPoint(point.coordinate.x, point.coordinate.y - 1)
                },
                {
                    move: "DOWN_RIGHT",
                    score: 0,
                    point: findPoint(point.coordinate.x + 1, point.coordinate.y - 1)
                }
            ];
        };

const scoreAgainstPoint = (positions) => (target) => (p) => {
    const surroundingPoints = surroundingPointsInPositions(positions)(p.point)
        .filter(p => !(p.point.coordinate.x === target.coordinate.x && p.point.coordinate.y === target.coordinate.y));
    debug('Scoring ' + JSON.stringify(p));
    debug(JSON.stringify(surroundingPoints));
    if (p.point.playerName) {
        debug('Point is occupied');
        if (p.point.playerName !== target.playerName) {
            debug('Other player');
            if (surroundingPoints.some((s) => s.point.playerName && (s.point.playerName !== target.playerName))) {
                debug('Point is guarded');
                return 1;
            }
            debug('Safe to take');
            return 10;
        }
        debug('My player');
        return 0;
    }
    debug('Point is not occupied');
    return 5;
};

const scoreInPositions =
    (positions) =>
        (target) =>
            (point) => {
                const scorePoint = scoreAgainstPoint(positions)(target);

                point.score += scorePoint(point);
                // point.score = surroundingPointsInPositions(positions)(point)
                //     .filter(p => p.coordinate.x !== point.coordinate.x && p.coordinate.y !== point.coordinate.y)
                //     .map(scorePoint)
                //     .reduce(p => p.score, 0);
                return point;
            };

const distanceToPoint = (a, b) => Math.sqrt(Math.pow(a.coordinate.x - b.coordinate.x, 2) +
    Math.pow(a.coordinate.y - b.coordinate.y, 2));

const findClosestOpponent = (target, positions) => positions
    .filter((p) => p.playerName !== target.playerName)
    .sort((a, b) =>
        distanceToPoint(target, a) - distanceToPoint(target, b)
    )[0];

const comparePoints = (pointA, pointB) => pointB.score - pointA.score;

const determineNextMove = (positions, target) => {
    if (!positions.some((p) => p.playerName !== target.playerName)) {
        debug('We already won!');
        return 'STAY';
    }

    const surroundingPoints = surroundingPointsInPositions(positions);

    const scorePoint = scoreInPositions(positions)(target);

    const scoredPoints = surroundingPoints(target)
        .map(scorePoint);

    const closestOpponent = findClosestOpponent(target, positions);

    debug('Closest opponent: ' + JSON.stringify(closestOpponent));

    debug(JSON.stringify(scoredPoints
        .map(p => [p, distanceToPoint(closestOpponent, p.point)])
        .sort((a, b) => a[1] - b[1])));

    scoredPoints
        .map(p => [p, distanceToPoint(p.point, closestOpponent)])
        .sort((a, b) => a[1] - b[1])[0][0].score += 4;

    scoredPoints.sort(comparePoints);

    debug("Scored points: " + JSON.stringify(scoredPoints));

    return scoredPoints[0].move;
};

module.exports.nextMove = (event, context, callback) => {
    debug(event.body);

    const game = JSON.parse(event.body);

    const target = game.positionToMove;

    const positions = game.boardState.positions;

    debug('Point to move: ' + JSON.stringify(target));

    debug('Board state: ' + JSON.stringify(positions));

    const response = {
        statusCode: 200,
        body: determineNextMove(positions, target)
    };

    callback(null, response);
};
