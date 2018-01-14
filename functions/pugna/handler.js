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

const surroundingPoints = (positions, point) => {
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

const distanceToPoint = (a, b) => Math.sqrt(Math.pow(a.coordinate.x - b.coordinate.x, 2) +
    Math.pow(a.coordinate.y - b.coordinate.y, 2));

const findClosestOpponent = (positions) => (target) => positions
    .filter((p) => p.playerName !== target.playerName)
    .sort((a, b) =>
        distanceToPoint(target, a) - distanceToPoint(target, b)
    )[0];

const checkSafeMove = (positions) => (playerName) => (p) => {
    const captureSurrounds = surroundingPoints(positions, p.point);
    return !captureSurrounds.some(c => c.point.playerName && (c.point.playerName !== playerName));
};

const determineNextMove = (positions, target, boardSize) => {
    if (!positions.some((p) => p.playerName !== target.playerName)) {
        debug('We already won!');
        return 'STAY';
    }

    const safe = checkSafeMove(positions)(target.playerName);

    const eligiblePoints = surroundingPoints(positions, target)
        .filter(p => p.point.coordinate.x > -1
            && p.point.coordinate.x < boardSize
            && p.point.coordinate.y > -1
            && p.point.coordinate.y < boardSize);

    debug('Eligible moves: ' + JSON.stringify(eligiblePoints));
    const possibleCaptures = eligiblePoints
        .filter(p => p.point.playerName && (p.point.playerName !== target.playerName));
    const safeCaptures = possibleCaptures.filter(safe);

    const openPoints = eligiblePoints
        .filter(p => !p.point.playerName);

    const closest = findClosestOpponent(positions);

    const safeOpenPoints = openPoints
        .filter(safe)
        .map(p => {
            const closestOpponent = closest(target, positions);
            return [p, distanceToPoint(closestOpponent, p.point)]
        })
        .sort((a, b) => a[1] - b[1])
        .map(pd => pd[0]);

    if (safeCaptures.length) {
        debug('Safe captures: ' + JSON.stringify(safeCaptures));
        return safeCaptures[0].move;
    }

    if (safeOpenPoints.length) {
        debug('Safe open points: ' + JSON.stringify(safeOpenPoints));
        return safeOpenPoints[0].move;
    }

    if (possibleCaptures.length) {
        debug('Unsafe captures: ' + JSON.stringify(possibleCaptures));
        return possibleCaptures[0].move;
    }

    debug('Doing nothing');

    return 'STAY';
};

module.exports.nextMove = (event, context, callback) => {
    debug(event.body);

    const game = JSON.parse(event.body);

    const target = game.positionToMove;

    const positions = game.boardState.positions;

    const boardSize = game.boardState.boardSize;

    debug('Point to move: ' + JSON.stringify(target));

    debug('Board state: ' + JSON.stringify(positions));

    const response = {
        statusCode: 200,
        body: determineNextMove(positions, target, boardSize)
    };

    callback(null, response);
};
