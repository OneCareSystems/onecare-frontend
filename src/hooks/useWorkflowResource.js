import { useEffect, useState } from "react";

export default function useWorkflowResource(
  loader,
  params = {},
  refreshKey = 0,
) {
  const query = JSON.stringify(params);
  const generation = `${query}:${refreshKey}`;
  const [state, setState] = useState({
    generation: "",
    query: "",
    data: null,
    error: null,
  });
  useEffect(() => {
    const controller = new AbortController();
    let current = true;
    loader({ ...JSON.parse(query), signal: controller.signal }).then(
      (data) => {
        if (current) setState({ query, generation, data, error: null });
      },
      (error) => {
        if (current)
          setState((previous) => ({
            query,
            generation,
            data: previous.query === query ? previous.data : null,
            error,
          }));
      },
    );
    return () => {
      current = false;
      controller.abort();
    };
  }, [loader, query, generation]);
  return {
    data: state.query === query ? state.data : null,
    error: state.generation === generation ? state.error : null,
    loading: state.generation !== generation,
  };
}
