import { Router, Request, Response, NextFunction } from 'express';
import passport from 'passport';
import createError from 'http-errors';

export function authRouter(): Router {
    const router = Router();

    // POST /api/auth — logowanie, body: { username, password }
    router.post('/', (req: Request, res: Response, next: NextFunction) => {
        passport.authenticate('local', (err: unknown, user: Express.User | false, info: { message: string } | undefined) => {
            if (err) return next(err);
            if (!user) return next(createError(401, info?.message ?? 'Nieprawidłowe dane logowania'));
            req.logIn(user, (loginErr) => {
                if (loginErr) return next(loginErr);

                res.json({ id: user.id, username: user.username, roles: user.roles });
            });
        })(req, res, next);
    });

    // DELETE /api/auth — wylogowanie
    router.delete('/', (req: Request, res: Response, next: NextFunction) => {
        req.logout((err) => {
            if (err) return next(err);
            res.json({ message: 'Wylogowano' });
        });
    });

    // GET /api/auth — kim jestem (null gdy niezalogowany)
    router.get('/', (req: Request, res: Response) => {
        res.json(req.isAuthenticated() ? req.user : null);
    });

    return router;
}
