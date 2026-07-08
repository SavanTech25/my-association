
import React, { useEffect } from 'react';
import './css/App.css';

import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { useDispatch, useSelector } from 'react-redux';

import moment from 'moment';
import { removeAll } from './hooks/hooks.localStorage';
import { useLocation } from 'react-router-dom';

import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";

import BasicRouting from './routing/routing.basicRouting';
import SecurityRouting from './routing/routing.securityRouting';

import { getMemberById } from './backend/member.service';

function App() {

  const user= useSelector((state)=> state.userReducer.user);
  const limit= useSelector((state)=>state?.userReducer?.limit);
  const dispatch= useDispatch();
  const location= useLocation();

  const logout= ()=>{
    dispatch({type: "logout"});
    removeAll();
  }

  // Re-sync user profile from Redis on every startup.
  // This ensures the role (président, trésorier, etc.) is always
  // up-to-date even if the localStorage cache is stale.
  useEffect(()=>{
    const syncProfile = async () => {
      const userId = user?.id || user?.uid;
      if (!userId) return;
      try {
        const memberData = await getMemberById(userId);
        if (memberData) {
          dispatch({ type: "user-update", value: { ...user, ...memberData } });
        }
      } catch (err) {
        console.error("Profile sync error:", err);
      }
    };
    syncProfile();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.uid]);

  useEffect(()=>{
    const now= moment();
    if(limit && now.diff(moment(limit), "M")>=1){
      logout();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit, location])


  return (
    <>
      {
        user?.email ? <BasicRouting /> : <SecurityRouting />
      }
      <ToastContainer position="bottom-right" theme="dark" />
    </>
  );
}

export default App;
