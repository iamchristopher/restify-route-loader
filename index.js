import glob from 'glob';
import {
    join,
    parse
} from 'path';
import semver from 'semver';
import 'colors';

const DEFAULT_ROUTE_VERSION = '1.0.0';
const DEFAULT_SUPPORTED_VERBS = [ 'get', 'post', 'del', 'put' ];

export default (
    server = requiredParam('server'),
    {
        routes = join(process.cwd(), 'routes'),
        verbs = []
    } = {}
) => {
    const acceptedFilenames = [
        ...DEFAULT_SUPPORTED_VERBS,
        ...verbs
    ];

    glob(
        `**/+(${acceptedFilenames.join('|')})*.js`,
        { cwd: routes },
        (err, files) => files
            .map(mountRouteFromFileLocation({
                server,
                folder: routes
            }))
    );

    return (req, res, next) => next();
}

function mountRouteFromFileLocation ({
    server,
    folder
} = {}) {
    return file => {
        const parsedFile = parse(file);
        const requirePath = join(folder, file);
        const routeMethods = require(requirePath).default;

        if (typeof routeMethods === 'undefined') {
            return console.log(`Route file skipped! No export was found at ${requirePath}`.yellow);
        }

        routeMethods
            .forEach(mountResourceForHttpVerb({
                server,
                file: parsedFile
            }));
    };
}

function mountResourceForHttpVerb ({
    server,
    file
} = {}) {
    return ({
        controller,
        middleware = [],
        version = DEFAULT_ROUTE_VERSION
    } = {}) => {
        const [
            httpVerb,
            fileVersionOverride
        ] = file.name.split('-');
        const mountPath = file.dir.replace(new RegExp('/_', 'g'), '/:') || '/';

        server[httpVerb](
            {
                path: mountPath,
                version: semver.valid(fileVersionOverride) ? fileVersionOverride : version
            },
            middleware,
            controller
        );
    };
}

function requiredParam (name) {
    throw new Error(`${name} is a required option`);
}
