import { useState } from "react";
import { createContext } from "react";

export const UserContext = createContext({
    userData: {}, 
    updateUserData: () => {},
})

export const UserProvider = ({ children }) => {
    const [userData, setUserData] = useState({})

    const updateUserData = (user) => {
        setUserData(user)
    }

    return (
        <UserContext.Provider value={{userData, updateUserData}}>
            {children}
        </UserContext.Provider>
    )
}