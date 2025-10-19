<script lang="ts">
    import { kernel } from '../kernel/h2o';
    import type { ProcessManager } from '../kernel/modules/process/main';
    import { onMount } from 'svelte';
    
    let processes = [];
    let processManager: ProcessManager;
    
    onMount(() => {
        processManager = kernel.getService('process');
        if (processManager) {
            processManager.processStore.subscribe(value => {
                processes = value;
            });
        }
    });

    function killProcess(pid: number) {
        processManager?.killProcess(pid);
    }
</script>

<div class="process-list">
    <table>
        <thead>
            <tr>
                <th>PID</th>
                <th>Name</th>
                <th>Status</th>
                <th>Type</th>
                <th>Actions</th>
            </tr>
        </thead>
        <tbody>
            {#each processes as process (process.pid)}
            <tr>
                <td>{process.pid}</td>
                <td>{process.name}</td>
                <td>{process.status}</td>
                <td>{process.type}</td>
                <td>
                    <button on:click={() => killProcess(process.pid)}>Kill</button>
                </td>
            </tr>
            {/each}
        </tbody>
    </table>
</div>

<style>
    .process-list {
        padding: 1rem;
    }
    table {
        width: 100%;
        border-collapse: collapse;
    }
    th, td {
        padding: 0.5rem;
        text-align: left;
        border-bottom: 1px solid #ddd;
    }
    button {
        padding: 0.25rem 0.5rem;
        background: #ff4444;
        color: white;
        border: none;
        border-radius: 3px;
        cursor: pointer;
    }
</style>