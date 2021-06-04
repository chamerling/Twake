import React from "react";
import User from 'components/User/User';
import { UserType } from "app/models/User";

export const Mention = (props : any) => {
  console.log(props);
  const user: UserType = props.contentState.getEntity(props.entityKey).getData();
  //  return (
//    <div style={{display: "flex"}}>
//      <div className="icon">
//        <User user={user} small />
//      </div>
//      <div className="text">
//        <span style={{ textTransform: 'capitalize' }}>@{user.username}</span>
//      </div>
//    </div>
//  );
  return (
    <span className='label suggestion mention'>
      {props.children}
    </span>
  );
}