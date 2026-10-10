declare namespace domain {
  class Fault extends Error { code: string; constructor(code: string, message: string); }
  type Move = {fr:number;fc:number;tr:number;tc:number};
  type Event = {action:string;requestId?:string;code?:string;version?:number;move?:Move;kind?:string;accept?:boolean};
  type Room = { _id:string;red:string;black:string|null;version:number;expiresAt:number; [key:string]:unknown };
  type View = {code:string;you:'r'|'b';version:number;board:(string|null)[][];history:unknown[];pending:unknown;status:string; [key:string]:unknown};
  function create(who:string,id:string,now:number):Room;
  function code(value:unknown):string;
  function view(room:Room,who:string,now:number):View;
  function reduce(room:Room,who:string,event:Event,now:number):Room;
}
export = domain;
