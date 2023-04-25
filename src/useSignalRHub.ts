import { useState, useEffect, useRef } from "react";
import {
  HubConnectionBuilder,
  HubConnection,
  HubConnectionState
} from "@microsoft/signalr";

import { Options } from "./types";
import { defaultOptions } from "./globals";

export default function useSignalRHub(hubUrl: string, options?: Options) {

  const [signalRHub, setSignalRHub] = useState<HubConnection | null>(null);

  const optionsRef = useRef({...defaultOptions, ...options});

  useEffect(() => {
    optionsRef.current = {...defaultOptions, ...options};
  }, [options]);

  useEffect(() => {
    if(!optionsRef.current.enabled) return;
    let canceled = false;

    const hubConnectionSetup = new HubConnectionBuilder();

    if(optionsRef.current.httpTransportTypeOrOptions)
      // @ts-expect-error We don't care about abiding by the overloads
      hubConnectionSetup.withUrl(hubUrl, optionsRef.current.httpTransportTypeOrOptions);

    if(optionsRef.current.automaticReconnect) {
      if(optionsRef.current.automaticReconnect === true)
        hubConnectionSetup.withAutomaticReconnect();
      else
        // @ts-expect-error We don't care about abiding by the overloads
        hubConnectionSetup.withAutomaticReconnect(optionsRef.current.automaticReconnect);
    }

    if(optionsRef.current.logging)
      hubConnectionSetup.configureLogging(optionsRef.current.logging);

    if(optionsRef.current.hubProtocol)
      hubConnectionSetup.withHubProtocol(optionsRef.current.hubProtocol);

    const hubConnection = hubConnectionSetup.build();

    hubConnection
      .start()
      .then(() => {
        if (canceled) {
          hubConnection.stop().then(optionsRef.current.onDisconnected);
          return;
        }
        setSignalRHub(hubConnection);
        optionsRef.current.onConnected?.(hubConnection);
      })
      .catch((error) => {
        if (canceled) return;
        optionsRef.current.onError?.(error);
      });

    return () => {
      canceled = true;
      setSignalRHub(null);
      if (hubConnection.state === HubConnectionState.Connected)
        hubConnection.stop().then(optionsRef.current.onDisconnected);
    };
  }, [hubUrl, optionsRef.current.enabled]);

  return signalRHub;
}