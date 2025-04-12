import { useState, useEffect } from 'react';
import { auth } from '@/config/firebase';

const useFetchUserID = () => {
    const [userID, setUserID] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            if (user) {
                setUserID(user.uid);
            } else {
                setUserID(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    return { userID, loading };
};

export default useFetchUserID;