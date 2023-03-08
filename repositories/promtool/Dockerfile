ARG SOURCE_TAG
FROM prom/prometheus:${SOURCE_TAG} AS prometheus
broken
FROM alpine:3.17.2
COPY --from=prometheus /bin/promtool /bin/promtool

ENTRYPOINT ["/bin/promtool"]