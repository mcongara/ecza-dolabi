'use client';
import {createContext,useContext,useMemo,useState,type Dispatch,type SetStateAction,type ReactNode} from 'react';
import {applyOtcDisposition,type Medicine} from '@/lib/analysis';
import type {Evaluation} from '@/lib/queue';

type Inventory = {
 medicines:Medicine[];
 setMedicines:Dispatch<SetStateAction<Medicine[]>>;
 evaluations:Record<string,Evaluation>;
 setEvaluations:Dispatch<SetStateAction<Record<string,Evaluation>>>;
};
const InventoryContext=createContext<Inventory|null>(null);
export function InventoryProvider({children}:{children:ReactNode}){
 const [medicines,setMedicines]=useState<Medicine[]>([]);
 const [storedEvaluations,setEvaluations]=useState<Record<string,Evaluation>>({});
 const evaluations=useMemo(()=>Object.fromEntries(Object.entries(storedEvaluations).map(([id,e])=>[id,{...e,result:applyOtcDisposition(e.result,e.otcAnswer?.probability)}])),[storedEvaluations]);
 return <InventoryContext.Provider value={{medicines,setMedicines,evaluations,setEvaluations}}>{children}</InventoryContext.Provider>;
}
export function useInventory(){
 const inventory=useContext(InventoryContext);
 if(!inventory)throw Error('InventoryProvider is required');
 return inventory;
}
