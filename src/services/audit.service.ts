import { DatabaseSync } from 'node:sqlite';

export const AuditService = {
    log: (db: DatabaseSync, user: any, action: string, type: string, id: number, oldData: any, newData: any, reason?: string) => {
        try {
            const stmt = db.prepare(`
                INSERT INTO audit_logs (user_id, user_email, action, entity_type, entity_id, old_data, new_data, reason) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `);
            
            // Zabezpieczamy każdą zmienną, aby node:sqlite nigdy nie otrzymał 'undefined'
            stmt.run(
                user?.id || 0, 
                user?.email || user?.username || 'nieznany', 
                action, 
                type, 
                id, 
                JSON.stringify(oldData || null), 
                JSON.stringify(newData || null),
                reason || null
            );
        } catch (err) {
            // Wypisujemy błąd na serwerze, ale nie przerywamy działania aplikacji!
            console.error('--- BŁĄD SYSTEMU AUDYTU ---', err);
        }
    }
};